import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Button from '../components/Button';
import { api } from '../lib/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [create, setCreate] = useState({ name: '', description: '' });
  const [inviteCode, setInviteCode] = useState('');

  async function load() {
    const { data } = await api.get('/campaigns');
    setCampaigns(data);
  }

  async function createCampaign(event) {
    event.preventDefault();
    await api.post('/campaigns', create);
    setCreate({ name: '', description: '' });
    load();
  }

  async function join(event) {
    event.preventDefault();
    await api.post('/campaigns/join', { inviteCode });
    setInviteCode('');
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-6 sm:px-4 sm:py-10">
      <h1 className="font-display text-4xl text-bone">Campanhas</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form onSubmit={createCampaign} className="gothic-panel space-y-3 p-4 sm:p-5">
          <h2 className="font-display text-2xl text-bone">Criar campanha</h2>
          <input className="field" placeholder="Nome" value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} />
          <textarea className="field" placeholder="Descrição" value={create.description} onChange={(e) => setCreate({ ...create, description: e.target.value })} />
          <Button className="w-full sm:w-auto">Criar</Button>
        </form>
        <form onSubmit={join} className="gothic-panel space-y-3 p-4 sm:p-5">
          <h2 className="font-display text-2xl text-bone">Entrar com convite</h2>
          <input className="field" placeholder="Código" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          <Button className="w-full sm:w-auto">Entrar</Button>
        </form>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="gothic-panel soft-motion block p-5">
            <h2 className="font-display text-2xl text-bone">{campaign.name}</h2>
            <p className="mt-2 text-sm text-mist">{campaign.description}</p>
            <p className="tabular mt-4 text-xs text-ember">Convite: {campaign.invite_code}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
