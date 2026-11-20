from pydantic import BaseModel


class RegionOut(BaseModel):
    id_region: str
    region_name: str
    department: str

    model_config = {"from_attributes": True}
