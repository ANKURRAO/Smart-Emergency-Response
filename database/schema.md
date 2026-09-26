# Realtime Database Schema
users/{uid}: email, role, createdAt, name, phone
incidents/{incidentId}: type, severity, description, latitude, longitude, status, citizenId, responderId, createdAt, updatedAt, aiPriority
responders/{uid}: name, availability, latitude, longitude, lastUpdated
notifications/{uid}/{notificationId}: title, message, read, createdAt

Roles: citizen | responder | admin