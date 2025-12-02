from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseAgent(ABC):
    """Base class for all agents"""
    
    def __init__(self, name: str):
        self.name = name
    
    @abstractmethod
    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent's task and return updated state"""
        pass