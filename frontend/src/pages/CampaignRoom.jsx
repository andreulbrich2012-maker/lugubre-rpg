import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Button from '../components/Button';
import { API_URL, api } from '../lib/api';

export default function CampaignRoom() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const token = localStorage.getItem('lugubre-token');
  const socket = useMemo(() => io(API_URL, { auth: { token }, autoConnect: false }), [token]);

  useEffect(() => {
    let cancelled = false;
    let poll;
    async function loadRoom() {
      const { data } = await api.get(`/campaigns/${id}`);
      if (!cancelled) {
        setRoom(data);
        setMessages(data.messages);
      }
    }
    loadRoom();
    poll = setInterval(loadRoom, 5000);
    socket.connect();
    socket.emit('campaign:join', id);
    socket.on('message:new', (message) => setMessages((current) => [...current, message]));
    return () => {
      cancelled = true;
      clearInterval(poll);
      socket.disconnect();
    };
  }, [id, socket]);

  async function send(event) {
    event.preventDefault();
    if (!content.trim()) return;
    try {
      const { data } = await api.post(`/campaigns/${id}/messages`, { content });
      setMessages((current) => [...current, data]);
      socket.emit('message:send', { campaignId: id, content });
    } catch {
      socket.emit('message:send', { campaignId: id, content });
    }
    setContent('');
  }

  if (!room) return <main className="px-4 py-10 text-mist">Carregando...</main>;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-3 py-5 sm:px-4 sm:py-10 md:grid-cols-[280px_1fr]">
      <aside className="gothic-panel rounded-md p-5">
        <h1 className="font-display text-3xl text-ember">{room.campaign.name}</h1>
        <p className="mt-2 text-sm text-mist">{room.campaign.description}</p>
        <h2 className="mt-6 font-semibold">Jogadores</h2>
        <ul className="mt-3 space-y-2 text-sm text-mist">
          {room.members.map((member) => <li key={member.id}>{member.name} · {member.character_name || 'sem ficha'}</li>)}
        </ul>
      </aside>
      <section className="gothic-panel flex min-h-[70vh] min-w-0 flex-col rounded-md p-4 sm:p-5 md:min-h-[560px]">
        <div className="flex-1 space-y-3 overflow-auto">
          {messages.map((message) => (
            <div key={message.id} className="rounded-md bg-black/30 p-3">
              <strong className="text-ember">{message.user_name}</strong>
              <p className="text-mist">{message.content}</p>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input className="flex-1 rounded-md border border-ember/20 bg-black/30 px-3 py-2" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escreva no chat..." />
          <Button>Enviar</Button>
        </form>
      </section>
    </main>
  );
}
