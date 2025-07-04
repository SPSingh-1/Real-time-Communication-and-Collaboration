import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const EventDetailPage = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:3001/events/${id}`, {
      headers: {
        'auth-token': localStorage.getItem('token')
      }
    })
      .then((res) => res.json())
       .then(data => {
      console.log('Fetched Event:', data); // ✅ Check here
      setEvent(data);})
      .catch((err) => console.error('❌ Failed to fetch event:', err.message));
  }, [id]);

  if (!event) return <div>Loading event...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{event.title}</h2>
      <p>Date: {new Date(event.date).toLocaleDateString()}</p>
      <p>Time: {event.time}</p>
      <p>Description: {event.description || 'No description provided.'}</p>
    </div>
  );
};

export default EventDetailPage;
