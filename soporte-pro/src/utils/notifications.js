function notificationId(notification) {
    return notification?.id == null ? null : String(notification.id);
}

export function dedupeNotifications(notifications = []) {
    const seenIds = new Set();
    const uniqueNotifications = [];
    let hasDuplicates = false;

    notifications.forEach((notification) => {
        const id = notificationId(notification);

        if (!id) {
            uniqueNotifications.push(notification);
            return;
        }

        if (seenIds.has(id)) {
            hasDuplicates = true;
            return;
        }

        seenIds.add(id);
        uniqueNotifications.push(notification);
    });

    return hasDuplicates ? uniqueNotifications : notifications;
}

export function mergeNotification(previousNotifications = [], nextNotification) {
    const currentNotifications = dedupeNotifications(previousNotifications);
    const nextId = notificationId(nextNotification);

    if (
        nextId &&
        currentNotifications.some(
            (notification) => notificationId(notification) === nextId
        )
    ) {
        return currentNotifications;
    }

    return nextNotification
        ? [nextNotification, ...currentNotifications]
        : currentNotifications;
}

export function mergeNotificationList(
    previousNotifications = [],
    nextNotifications = []
) {
    return dedupeNotifications([
        ...dedupeNotifications(previousNotifications),
        ...dedupeNotifications(nextNotifications),
    ]);
}
