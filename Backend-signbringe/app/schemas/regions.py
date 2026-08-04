from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RegionOut(BaseModel):
    id_region: str
    region_name: str
    department: str

    model_config = {"from_attributes": True}
