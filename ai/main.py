from fastapi import FastAPI
from pydantic import BaseModel

app=FastAPI(title="Smart Emergency Response AI",version="0.1.0")

class IncidentInput(BaseModel):
    description:str
    incident_type:str|None=None
    severity:str|None=None

@app.get("/")
def root(): return {"service":"Smart Emergency Response AI","status":"running"}

@app.post("/api/ai/analyze")
def analyze(data:IncidentInput):
    text=data.description.lower()
    priority="medium"
    if any(x in text for x in ["fire","unconscious","critical","major accident"]): priority="critical"
    elif any(x in text for x in ["injury","accident","smoke","bleeding"]): priority="high"
    return {"classification":data.incident_type or "unknown","suggested_priority":priority,"confidence":0.50,"model":"rule-based-starter"}