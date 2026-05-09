from __future__ import annotations

import datetime
import json
from typing import Any, Optional

from sqlalchemy import JSON, Boolean, Column, DateTime, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class ActionsLog(Base):
    __tablename__ = "actions_log"

    time:           Column[datetime.datetime] = Column(DateTime(timezone=True), primary_key=True, server_default=text("now()"))
    farm_id:        Column[str]               = Column(String(50), nullable=False)
    zone_id:        Column[str]               = Column(String(50), nullable=False)
    actuator_id:    Column[str]               = Column(String(50), nullable=False)
    action:         Column[str]               = Column(String(10), nullable=False)
    mode:           Column[str]               = Column(String(10), nullable=False)
    previous_state: Column[bool]              = Column(Boolean, nullable=False)
    params:         Column[dict[str, Any]]    = Column(JSONB)
    triggered_by:   Column[str]               = Column(String(20), nullable=False, server_default=text("'system'"))
    auto_off_at:    Column[Optional[datetime.datetime]] = Column(DateTime(timezone=True))
    status:         Column[str]               = Column(String(20), nullable=False, server_default=text("'pending'"))

    def __repr__(self) -> str:
        return (
            f"<ActionsLog(time={self.time}, zone_id='{self.zone_id}', "
            f"actuator_id='{self.actuator_id}', action='{self.action}', "
            f"status='{self.status}')>"
        )

    def to_dict(self) -> dict:
        return {
            "time":           self.time.isoformat() if self.time else None,
            "farm_id":        self.farm_id,
            "zone_id":        self.zone_id,
            "actuator_id":    self.actuator_id,
            "action":         self.action,
            "mode":           self.mode,
            "previous_state": self.previous_state,
            "params":         json.loads(self.params) if isinstance(self.params, str) else self.params,
            "triggered_by":   self.triggered_by,
            "auto_off_at":    self.auto_off_at.isoformat() if self.auto_off_at else None,
            "status":         self.status,
        }