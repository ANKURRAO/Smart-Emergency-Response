````md
# Smart Emergency Response - Database Schema

## Database

Firebase Realtime Database

## Main Collections

- users
- incidents
- responders
- notifications

---

## 1. Users

Path:

users/{uid}

Example:

```json
{
  "email": "user@example.com",
  "role": "citizen",
  "name": "User Name",
  "phone": "9876543210",
  "createdAt": 1758000000000
}
````

Roles:

* citizen
* responder
* admin

---

## 2. Incidents

Path:

incidents/{incidentId}

Example:

```json
{
  "citizenId": "USER_UID",
  "category": "medical",
  "title": "Medical Emergency",
  "description": "Emergency medical assistance required.",
  "severity": "critical",
  "priority": 95,
  "status": "reported",

  "location": {
    "latitude": 26.7606,
    "longitude": 83.3732,
    "address": "Gorakhpur, Uttar Pradesh"
  },

  "imageUrl": "",
  "responderId": "",

  "ai": {
    "category": "medical",
    "severity": "critical",
    "priority": 95,
    "confidence": 0.91,
    "duplicate": false
  },

  "createdAt": 1758000000000
}
```

---

## 3. Incident Categories

Supported categories:

* medical
* fire
* accident
* crime
* natural_disaster
* flood
* earthquake
* rescue
* missing_person
* other

---

## 4. Severity Levels

* low
* medium
* high
* critical

---

## 5. Incident Status

Normal lifecycle:

reported → assigned → accepted → on_the_way → arrived → resolved

Alternative:

cancelled

---

## 6. Location

```json
{
  "latitude": 26.7606,
  "longitude": 83.3732,
  "address": "Gorakhpur, Uttar Pradesh"
}
```

Latitude range:

-90 to 90

Longitude range:

-180 to 180

---

## 7. Responders

Path:

responders/{responderId}

Example:

```json
{
  "userId": "RESPONDER_UID",
  "name": "Responder Name",
  "phone": "9876543210",
  "department": "Emergency Response",
  "availability": "available",

  "location": {
    "latitude": 26.7606,
    "longitude": 83.3732
  },

  "currentIncidentId": "",
  "updatedAt": 1758000000000
}
```

Availability:

* available
* busy
* offline

---

## 8. Notifications

Path:

notifications/{uid}/{notificationId}

Example:

```json
{
  "title": "Responder Assigned",
  "message": "A responder has been assigned to your emergency.",
  "type": "incident_assignment",
  "incidentId": "INCIDENT_ID",
  "read": false,
  "createdAt": 1758000000000
}
```

Notification types:

* incident_created
* incident_assignment
* incident_status
* responder_arrived
* incident_resolved
* system

---

## 9. AI Data

AI analysis can store:

* category
* severity
* priority
* confidence
* duplicate

Example:

```json
{
  "category": "fire",
  "severity": "high",
  "priority": 88,
  "confidence": 0.93,
  "duplicate": false
}
```

---

## 10. Authentication

Firebase Authentication manages:

* Email/password
* User UID
* Login session
* Authentication tokens

Passwords are NOT stored in Realtime Database.

---

## 11. Relationships

```text
Firebase Authentication
        |
        v
      User UID
        |
        +----> users/{uid}
        |
        +----> incidents/{incidentId}
        |
        +----> responders/{responderId}
        |
        +----> notifications/{uid}
```

---

## 12. Security

The system uses:

* Firebase Authentication
* Firebase Realtime Database Rules
* Role-based access
* Backend authentication middleware
* Environment variables

Never store passwords or private API keys in the database.

---

## 13. Timestamp

Timestamps are stored as Unix milliseconds.

Example:

1758000000000

```
```
