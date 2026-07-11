import { useEffect, useMemo, useState } from 'react';
import { Check, Edit, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import Alert from '../Alert';
import Button from '../Button';
import LoadingButton from '../LoadingButton';
import { api } from '../../lib/api';

const shopCategories = [
  'Taverna',
  'Ferreiro',
  'Alquimista',
  'Mercado Geral',
  'Loja Mística',
  'Estábulo',
  'Alfaiate',
  'Contrabandista',
  'Templo',
  'Biblioteca',
  'Armazém',
  'Curandeiro'
];

const baseItems = {
  Taverna: [
    ['Pão', 1], ['Refeição simples', 3], ['Refeição boa', 8], ['Cerveja comum', 2], ['Hospedagem simples', 10], ['Hospedagem confortável', 25]
  ],
  Ferreiro: [
    ['Espada curta', 45], ['Espada longa', 90], ['Escudo', 40], ['Armadura leve', 120], ['Armadura média', 260], ['Reparo de arma', 20]
  ],
  Alquimista: [
    ['Poção de cura', 60], ['Antídoto', 35], ['Frasco de ácido', 45], ['Ervas raras', 25], ['Componentes alquímicos', 40]
  ],
  'Mercado Geral': [
    ['Corda', 8], ['Tocha', 1], ['Mochila', 12], ['Ração', 2], ['Cantil', 5], ['Ferramentas simples', 25]
  ],
  'Loja Mística': [
    ['Pergaminho mágico', 120], ['Cristal arcano', 180], ['Foco mágico', 95], ['Componente raro', 150], ['Amuleto simples', 210]
  ],
  Estábulo: [
    ['Cavalo comum', 350], ['Mula', 120], ['Sela', 40], ['Ração animal', 3], ['Hospedagem de montaria', 12]
  ],
  Alfaiate: [
    ['Capa reforçada', 35], ['Roupa nobre', 90], ['Luvas de couro', 12], ['Reparo de roupa', 5]
  ],
  Contrabandista: [
    ['Adaga escondida', 70], ['Veneno', 140], ['Documento falso', 220], ['Item roubado', 160], ['Informação secreta', 300]
  ],
  Templo: [
    ['Benção menor', 45], ['Água sagrada', 25], ['Símbolo consagrado', 80], ['Cura ritual', 150]
  ],
  Biblioteca: [
    ['Mapa antigo', 75], ['Tomo comum', 35], ['Pesquisa guiada', 20], ['Cópia de manuscrito', 55]
  ],
  Armazém: [
    ['Baú pequeno', 15], ['Barril', 8], ['Caixa reforçada', 22], ['Saco de grãos', 6]
  ],
  Curandeiro: [
    ['Kit de curativo', 30], ['Pomada medicinal', 18], ['Consulta', 12], ['Tratamento completo', 95]
  ]
};

const blankShop = { name: '', description: '', category: 'Taverna', visibleToPlayers: true };
const blankItem = { name: '', description: '', category: 'Taverna', priceDracmas: 1, stock: 1, weight: 0, available: true, note: '' };

export default function CampaignShopsTab({ campaignId, isMaster, characters = [] }) {
  const [shops, setShops] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [shopEditor, setShopEditor] = useState(null);
  const [itemEditor, setItemEditor] = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const visibleShops = useMemo(() => {
    if (activeCategory === 'Todos') return shops;
    return shops.filter((shop) => shop.category === activeCategory);
  }, [shops, activeCategory]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/campaigns/${campaignId}/shops`);
      setShops(data.shops || []);
      setRequests(data.requests || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => setLoading(false)); }, [campaignId]);

  async function saveShop(event) {
    event.preventDefault();
    const payload = shopEditor.shop;
    try {
      if (shopEditor.mode === 'edit') await api.put(`/campaigns/${campaignId}/shops/${payload.id}`, payload);
      else await api.post(`/campaigns/${campaignId}/shops`, payload);
      setShopEditor(null);
      setMessage({ type: 'success', text: 'Loja salva.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível salvar a loja.' });
    }
  }

  async function deleteShop(shop) {
    if (!window.confirm('Tem certeza que deseja deletar esta loja? Essa ação não poderá ser desfeita.')) return;
    await api.delete(`/campaigns/${campaignId}/shops/${shop.id}`);
    setMessage({ type: 'success', text: 'Loja deletada.' });
    await load();
  }

  async function saveItem(event) {
    event.preventDefault();
    const payload = itemEditor.item;
    try {
      if (itemEditor.mode === 'edit') await api.put(`/campaigns/${campaignId}/shop-items/${payload.id}`, payload);
      else await api.post(`/campaigns/${campaignId}/shops/${itemEditor.shop.id}/items`, payload);
      setItemEditor(null);
      setMessage({ type: 'success', text: 'Item salvo.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível salvar o item.' });
    }
  }

  async function deleteItem(item) {
    if (!window.confirm('Remover este item da loja?')) return;
    await api.delete(`/campaigns/${campaignId}/shop-items/${item.id}`);
    setMessage({ type: 'success', text: 'Item removido.' });
    await load();
  }

  async function seedBase(shop) {
    const items = baseItems[shop.category] || [];
    for (const [name, priceDracmas] of items) {
      await api.post(`/campaigns/${campaignId}/shops/${shop.id}/items`, {
        ...blankItem,
        name,
        priceDracmas,
        category: shop.category,
        stock: 10,
        description: `Item base de ${shop.category}.`
      });
    }
    setMessage({ type: 'success', text: 'Economia base adicionada.' });
    await load();
  }

  async function requestPurchase(event) {
    event.preventDefault();
    try {
      await api.post(`/campaigns/${campaignId}/purchase-requests`, {
        itemId: purchase.item.id,
        shopId: purchase.shop.id,
        characterId: purchase.characterId || null,
        quantity: Number(purchase.quantity) || 1
      });
      setPurchase(null);
      setMessage({ type: 'success', text: 'Compra enviada para o mestre.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível solicitar compra.' });
    }
  }

  async function decideRequest(request, approve) {
    try {
      await api.put(`/campaigns/${campaignId}/purchase-requests/${request.id}/${approve ? 'approve' : 'deny'}`);
      setMessage({ type: 'success', text: approve ? 'Compra aprovada.' : 'Compra negada.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Não foi possível atualizar a compra.' });
    }
  }

  return (
    <section className="gothic-panel rounded-md p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.24em] text-ember/70">Economia</p>
          <h2 className="font-display text-3xl text-ember">Lojas da Campanha</h2>
          <p className="mt-1 text-sm text-mist">Itens em Dracmas, pedidos de compra e estoque controlado pelo mestre.</p>
        </div>
        {isMaster && <Button className="w-full sm:w-auto" onClick={() => setShopEditor({ mode: 'add', shop: blankShop })}><Plus size={16} /> Nova loja</Button>}
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {['Todos', ...shopCategories].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`min-h-10 shrink-0 rounded-md border px-3 py-2 text-sm ${activeCategory === category ? 'border-ember/60 bg-ember/15 text-white' : 'border-white/10 bg-black/25 text-mist'}`}
          >
            {category}
          </button>
        ))}
      </div>

      {message && <div className="mt-4"><Alert type={message.type}>{message.text}</Alert></div>}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleShops.map((shop) => (
            <article key={shop.id} className="rounded-md border border-ember/15 bg-black/25 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[.18em] text-ember">{shop.category}</p>
                  <h3 className="break-words font-display text-2xl text-white">{shop.name}</h3>
                  <p className="mt-1 text-sm text-mist">{shop.description || 'Sem descrição.'}</p>
                  {!shop.visible_to_players && <p className="mt-2 text-xs text-amber-200">Oculta para jogadores</p>}
                </div>
                {isMaster && (
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button variant="ghost" className="px-3" onClick={() => setShopEditor({ mode: 'edit', shop: { ...shop, visibleToPlayers: shop.visible_to_players } })}><Edit size={16} /></Button>
                    <Button variant="ghost" className="px-3 text-red-200" onClick={() => deleteShop(shop)}><Trash2 size={16} /></Button>
                  </div>
                )}
              </div>

              {isMaster && (
                <div className="mt-4 grid gap-2 sm:flex">
                  <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setItemEditor({ mode: 'add', shop, item: { ...blankItem, category: shop.category } })}>Adicionar item</Button>
                  <Button variant="ghost" className="w-full sm:w-auto" onClick={() => seedBase(shop)}>Itens base</Button>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {(shop.items || []).map((item) => (
                  <div key={item.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <h4 className="font-semibold text-white">{item.name}</h4>
                        <p className="text-sm text-mist">{item.description || item.note || 'Item disponível.'}</p>
                        <p className="mt-2 text-xs text-ember">{item.price_dracmas} Dracmas · estoque {item.stock}</p>
                      </div>
                      <div className="grid gap-2 sm:flex">
                        {isMaster ? (
                          <>
                            <Button variant="ghost" className="px-3" onClick={() => setItemEditor({ mode: 'edit', shop, item: { ...item, priceDracmas: item.price_dracmas } })}><Edit size={15} /></Button>
                            <Button variant="ghost" className="px-3 text-red-200" onClick={() => deleteItem(item)}><Trash2 size={15} /></Button>
                          </>
                        ) : (
                          <Button className="w-full sm:w-auto" disabled={!item.available || item.stock <= 0} onClick={() => setPurchase({ shop, item, quantity: 1, characterId: characters[0]?.id || '' })}>
                            <ShoppingBag size={15} /> Comprar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!shop.items?.length && <p className="rounded-md border border-dashed border-white/10 p-3 text-sm text-mist">Nenhum item cadastrado.</p>}
              </div>
            </article>
          ))}
          {!visibleShops.length && <p className="rounded-md border border-dashed border-ember/20 bg-black/20 p-6 text-center text-mist">{loading ? 'Carregando lojas...' : 'Nenhuma loja nesta classificação.'}</p>}
        </div>

        {isMaster && (
          <aside className="rounded-md border border-ember/15 bg-black/25 p-4">
            <h3 className="font-display text-2xl text-ember">Pedidos</h3>
            <div className="mt-3 space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="font-semibold text-white">{request.item_name} x{request.quantity}</p>
                  <p className="text-xs text-mist">{request.buyer_name} · {request.total_price} Dracmas · {request.status}</p>
                  {request.status === 'pending' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" className="px-3" onClick={() => decideRequest(request, true)}><Check size={15} /> Aprovar</Button>
                      <Button type="button" variant="ghost" className="px-3 text-red-200" onClick={() => decideRequest(request, false)}><X size={15} /> Negar</Button>
                    </div>
                  )}
                </div>
              ))}
              {!requests.length && <p className="text-sm text-mist">Nenhum pedido pendente.</p>}
            </div>
          </aside>
        )}
      </div>

      {shopEditor && <ShopForm editor={shopEditor} setEditor={setShopEditor} onClose={() => setShopEditor(null)} onSubmit={saveShop} />}
      {itemEditor && <ItemForm editor={itemEditor} setEditor={setItemEditor} onClose={() => setItemEditor(null)} onSubmit={saveItem} />}
      {purchase && <PurchaseModal purchase={purchase} setPurchase={setPurchase} characters={characters} onClose={() => setPurchase(null)} onSubmit={requestPurchase} />}
    </section>
  );
}

function ShopForm({ editor, setEditor, onClose, onSubmit }) {
  const shop = editor.shop;
  const update = (patch) => setEditor({ ...editor, shop: { ...shop, ...patch } });
  return (
    <Modal title={editor.mode === 'edit' ? 'Editar loja' : 'Nova loja'} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Nome da loja" value={shop.name} onChange={(event) => update({ name: event.target.value })} />
        <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={shop.category} onChange={(event) => update({ category: event.target.value })}>
          {shopCategories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <textarea className="min-h-28 rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Descrição" value={shop.description || ''} onChange={(event) => update({ description: event.target.value })} />
        <label className="flex items-center gap-2 rounded-md border border-ember/15 bg-black/20 p-3 text-sm text-mist">
          <input type="checkbox" checked={Boolean(shop.visibleToPlayers ?? shop.visible_to_players)} onChange={(event) => update({ visibleToPlayers: event.target.checked })} />
          Visível para jogadores
        </label>
        <div className="grid gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button>Salvar loja</Button>
        </div>
      </form>
    </Modal>
  );
}

function ItemForm({ editor, setEditor, onClose, onSubmit }) {
  const item = editor.item;
  const update = (patch) => setEditor({ ...editor, item: { ...item, ...patch } });
  return (
    <Modal title={editor.mode === 'edit' ? 'Editar item' : 'Novo item'} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Nome do item" value={item.name} onChange={(event) => update({ name: event.target.value })} />
        <textarea className="min-h-24 rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Descrição" value={item.description || ''} onChange={(event) => update({ description: event.target.value })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Preço" value={item.priceDracmas ?? item.price_dracmas} onChange={(priceDracmas) => update({ priceDracmas })} />
          <NumberField label="Estoque" value={item.stock} onChange={(stock) => update({ stock })} />
          <NumberField label="Peso" value={item.weight} onChange={(weight) => update({ weight })} />
        </div>
        <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={item.category || editor.shop.category} onChange={(event) => update({ category: event.target.value })}>
          {shopCategories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-md border border-ember/15 bg-black/20 p-3 text-sm text-mist">
          <input type="checkbox" checked={Boolean(item.available ?? true)} onChange={(event) => update({ available: event.target.checked })} />
          Disponível
        </label>
        <input className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" placeholder="Observação opcional" value={item.note || ''} onChange={(event) => update({ note: event.target.value })} />
        <div className="grid gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button>Salvar item</Button>
        </div>
      </form>
    </Modal>
  );
}

function PurchaseModal({ purchase, setPurchase, characters, onClose, onSubmit }) {
  const total = (Number(purchase.quantity) || 1) * Number(purchase.item.price_dracmas || 0);
  return (
    <Modal title="Solicitar compra" onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="rounded-md border border-ember/15 bg-black/25 p-3">
          <h3 className="font-display text-2xl text-white">{purchase.item.name}</h3>
          <p className="text-sm text-mist">{purchase.shop.name}</p>
          <p className="mt-2 text-ember">{total} Dracmas</p>
        </div>
        <NumberField label="Quantidade" value={purchase.quantity} onChange={(quantity) => setPurchase({ ...purchase, quantity })} />
        <select className="rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={purchase.characterId || ''} onChange={(event) => setPurchase({ ...purchase, characterId: event.target.value })}>
          <option value="">Sem personagem vinculado</option>
          {characters.map((character) => <option key={character.id} value={character.id}>{character.character_name}</option>)}
        </select>
        <div className="grid gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button>Enviar pedido</Button>
        </div>
      </form>
    </Modal>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="text-sm text-mist">
      {label}
      <input type="number" min="0" className="mt-1 w-full rounded-md border border-ember/20 bg-black/30 px-3 py-3" value={value ?? 0} onChange={(event) => onChange(Number(event.target.value) || 0)} />
    </label>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur">
      <section className="gothic-panel max-h-[92vh] w-full max-w-2xl overflow-auto rounded-md p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl text-ember">{title}</h2>
          <button type="button" className="grid h-10 w-10 place-items-center rounded border border-white/15" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}
