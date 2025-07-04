const NotificationEvent = (groupedEvents, userEmail) => {
  const now = new Date();
  const todayKey = now.toDateString();

  if (!groupedEvents[todayKey]) return;

  groupedEvents[todayKey].forEach(event => {
    const [hour, minute] = event.time.split(':');
    const eventTime = new Date(event.date);
    eventTime.setHours(hour, minute, 0, 0);

    const diffMs = eventTime - now;
    const diffMin = Math.floor(diffMs / (60 * 1000));

    if (diffMin <= 60 && diffMin >= 0) {
     const title = `⏰ ${userEmail} - Upcoming Event`;
      const body = `📅 "${event.title}" at ${event.time}`;


      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    }
  });
};

export default NotificationEvent;
