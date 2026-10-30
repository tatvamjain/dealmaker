from decimal import Decimal, InvalidOperation

from google.genai import types

from app.agent.catalog import PRODUCTS
#the types.tool this is from google genai which tells the llm that there are these functions which are defined its like a blueprint of the function
#declaring the function what is its name what is the description and its parameters.
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


def run_tool(name: str, args: dict, state: dict) -> dict:
    if name == "get_product":
        return get_product(str(args.get("product_id", "")))
    if name == "propose_offer":
        return propose_offer(str(args.get("product_id", "")), str(args.get("price", "")), state)
    return {"error": f"Unknown tool '{name}'"}