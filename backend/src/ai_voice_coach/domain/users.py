from pydantic import BaseModel


class User(BaseModel):
    id: str
    display_name: str
