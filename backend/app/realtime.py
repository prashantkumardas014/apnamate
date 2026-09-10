from datetime import datetime
from sqlalchemy.orm import Session

from .models import Notification

try:
    import socketio
except ModuleNotFoundError:  # Optional until realtime transport is enabled.
    socketio = None


sio = socketio.AsyncServer(cors_allowed_origins=[]) if socketio else None


if sio:
    @sio.event
    async def connect(sid, environ):
        print(f"Client connected: {sid}")
        return True

    @sio.event
    async def disconnect(sid):
        print(f"Client disconnected: {sid}")

    @sio.event
    async def authenticate(sid, data):
        user_id = data.get("user_id") if isinstance(data, dict) else None
        if not user_id:
            return {"status": "failed"}
        await sio.enter_room(sid, f"user_{user_id}")
        return {"status": "authenticated", "user_id": user_id}


async def notify_new_booking(booking, customer_name, provider_id):
    if sio:
        await sio.emit(
            "new_booking",
            {
                "booking_id": booking.id,
                "customer_name": customer_name,
                "service": booking.service,
                "date": booking.date,
                "time": booking.time,
                "message": f"New booking request from {customer_name}",
            },
            room=f"user_{provider_id}",
        )


async def notify_booking_update(booking, user_id, status):
    if sio:
        await sio.emit(
            "booking_update",
            {
                "booking_id": booking.id,
                "status": status,
                "service": booking.service,
                "message": f"Your booking status updated to {status}",
            },
            room=f"user_{user_id}",
        )


async def notify_new_message(user_id, sender_name, message):
    if sio:
        await sio.emit(
            "new_message",
            {
                "sender_name": sender_name,
                "message": message,
                "time": datetime.now().isoformat(),
            },
            room=f"user_{user_id}",
        )


async def update_notification_count(user_id, count):
    if sio:
        await sio.emit(
            "notification_count",
            {"count": count},
            room=f"user_{user_id}",
        )


def save_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        is_read=0,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification