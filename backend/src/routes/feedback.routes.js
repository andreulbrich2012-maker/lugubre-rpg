import { Router } from 'express';
import { z } from 'zod';
import { tryQuery } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

export const feedbackTypes = [
  'Bug',
  'Sugestão',
  'Ideia',
  'Melhoria visual',
  'Problema no celular',
  'Problema de conta/login',
  'Problema em ficha',
  'Problema em campanha',
  'Outro'
];

export const feedbackPriorities = ['Baixa', 'Média', 'Alta', 'Urgente'];
export const feedbackStatuses = ['Enviado', 'Em análise', 'Em desenvolvimento', 'Resolvido', 'Recusado'];

const feedbackSchema = z.object({
  title: z.string().trim().min(3).max(140),
  type: z.enum(feedbackTypes).default('Outro'),
  description: z.string().trim().min(10).max(8000),
  priority: z.enum(feedbackPriorities).default('Média'),
  pageContext: z.string().trim().max(240).optional().default(''),
  attachmentUrl: z.string().trim().max(1_500_000).optional().default('')
});

function badRequest(res, error) {
  return res.status(400).json({
    message: 'Verifique os campos do feedback.',
    issues: error.issues?.map((issue) => issue.message) || []
  });
}

function feedbackSelect(extra = '') {
  return `
    select f.*,
           u.name as user_name,
           u.email as user_email,
           admin.name as admin_name
    from feedbacks f
    join users u on u.id = f.user_id
    left join users admin on admin.id = f.admin_id
    ${extra}
  `;
}

router.get('/my', async (req, res) => {
  const result = await tryQuery(
    `${feedbackSelect('where f.user_id = $1')}
     order by f.created_at desc`,
    [req.user.id]
  );
  res.json(result?.rows || []);
});

router.post('/', async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  const feedback = parsed.data;
  const result = await tryQuery(
    `insert into feedbacks (user_id, title, type, description, priority, page_context, attachment_url)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [
      req.user.id,
      feedback.title,
      feedback.type,
      feedback.description,
      feedback.priority,
      feedback.pageContext || '',
      feedback.attachmentUrl || ''
    ]
  );

  if (!result) return res.status(503).json({ message: 'Banco de dados indisponível para salvar feedback.' });
  res.status(201).json({
    message: 'Feedback enviado com sucesso. Obrigado por ajudar a melhorar o Lúgubre RPG.',
    feedback: result.rows[0]
  });
});

export default router;
