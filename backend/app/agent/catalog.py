from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True) #frozen keyword makes product immutable so no code can change the price at runtime
class Product:
    id: str
    name: str
    description: str
    list_price: Decimal
    floor_price: Decimal  # private: never sent to the model or the shopper


PRODUCTS: dict[str, Product] = {
    "jacket-01": Product(
        id="jacket-01",
        name="Alpine Winter Jacket",
        description="Water-resistant, insulated, available in 3 colours.",
        list_price=Decimal("120.00"),
        floor_price=Decimal("95.00"),
    ),
}