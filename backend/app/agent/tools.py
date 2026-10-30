import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from google.genai import types

from app.agent.catalog import PRODUCTS
from app.services.paypal import PayPalClient, PayPalError

logger = logging.getLogger(__name__)


@dataclass
class ToolContext:
    session_id: str
    state: dict
    paypal: PayPalClient
    return_url: str
    cancel_url: str


TOOLS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="get_product",
            description="Look up a product's public details and list price.",
            parameters={
                "type": "OBJECT",
                "properties": {"product_id": {"type": "STRING"}},
                "required": ["product_id"],
            },
        ),
        types.FunctionDeclaration(
            name="propose_offer",
            description=(
                "Propose a price to the shopper. The system checks it against the "
                "merchant's private rules. Only present prices that come back allowed."
            ),
            parameters={
                "type": "OBJECT",
                "properties": {
                    "product_id": {"type": "STRING"},
                    "price": {"type": "STRING", "description": "USD price, e.g. '104.00'"},
                },
                "required": ["product_id", "price"],
            },
        ),
        types.FunctionDeclaration(
            name="create_checkout",
            description=(
                "Create a PayPal payment link for the most recent allowed offer. "
                "Call only after the shopper clearly agrees to that offer."
            ),
            parameters={
                "type": "OBJECT",
                "properties": {"product_id": {"type": "STRING"}},
                "required": ["product_id"],
            },
        ),
    ]
)


def get_product(product_id: str) -> dict:
    product = PRODUCTS.get(product_id)
    if product is None:
        return {"error": f"Unknown product '{product_id}'"}
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "list_price": str(product.list_price),
    }  # floor_price deliberately left out


def propose_offer(product_id: str, price: str, state: dict) -> dict:
    product = PRODUCTS.get(product_id)
    if product is None:
        return {"allowed": False, "reason": "Unknown product"}
    try:
        offer = Decimal(price).quantize(Decimal("0.01"))
    except InvalidOperation:
        return {"allowed": False, "reason": "Price must be a number like '104.00'"}
    if offer > product.list_price:
        return {"allowed": False, "reason": "Offer cannot exceed the list price"}
    if offer < product.floor_price:
        return {"allowed": False, "reason": "Too low for the merchant. Propose a higher price."}

    state["current_offer"] = {"product_id": product.id, "price": str(offer)}
    return {"allowed": True, "price": str(offer)}


async def create_checkout(product_id: str, ctx: ToolContext) -> dict:
    offer = ctx.state.get("current_offer")
    if not offer or offer["product_id"] != product_id:
        return {"ok": False, "reason": "No allowed offer for this product yet. Use propose_offer first."}

    product = PRODUCTS.get(product_id)
    price = Decimal(offer["price"])
    if product is None or price < product.floor_price:  # defense in depth
        return {"ok": False, "reason": "That offer is no longer valid. Propose a new one."}

    existing = ctx.state.get("checkout")
    if existing and existing["product_id"] == product_id and existing["price"] == offer["price"]:
        return {"ok": True, "approve_url": existing["approve_url"], "price": offer["price"]}

    try:
        order = await ctx.paypal.create_order(
            amount=price,
            currency="USD",
            description=product.name,
            return_url=ctx.return_url,
            cancel_url=ctx.cancel_url,
            request_id=f"{ctx.session_id}-{product_id}-{offer['price']}",
        )
    except PayPalError:
        logger.exception("Checkout failed for session %s", ctx.session_id)
        return {"ok": False, "reason": "Payment system unavailable. Ask the shopper to try again shortly."}

    approve_url = next(link["href"] for link in order["links"] if link["rel"] == "payer-action")
    ctx.state["checkout"] = {
        "order_id": order["id"],
        "product_id": product_id,
        "price": offer["price"],
        "approve_url": approve_url,
    }
    return {"ok": True, "approve_url": approve_url, "price": offer["price"]}


async def run_tool(name: str, args: dict, ctx: ToolContext) -> dict:
    if name == "get_product":
        return get_product(str(args.get("product_id", "")))
    if name == "propose_offer":
        return propose_offer(str(args.get("product_id", "")), str(args.get("price", "")), ctx.state)
    if name == "create_checkout":
        return await create_checkout(str(args.get("product_id", "")), ctx)
    return {"error": f"Unknown tool '{name}'"}