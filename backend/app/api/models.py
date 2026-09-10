"""Pydantic request bodies for the planner review endpoints."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ApproveRequest(BaseModel):
    note: Optional[str] = None


class EditRequest(BaseModel):
    new_start_minute: Optional[int] = Field(default=None, ge=0)
    remove_task_ids: Optional[List[str]] = None
    note: Optional[str] = None


class RejectRequest(BaseModel):
    reason: str
    note: Optional[str] = None


class AlertMarkRequest(BaseModel):
    read: Optional[bool] = None
    acknowledged: Optional[bool] = None
