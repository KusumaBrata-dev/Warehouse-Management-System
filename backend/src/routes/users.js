import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const usersRouter = Router();
usersRouter.use(authenticate);

// Non-admin list for dropdowns
usersRouter.get('/list', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true },
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

// Admin-only routes
usersRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

usersRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    let { username, password, name, role } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'username, password, name required' });
    
    username = username.trim().toLowerCase();
    password = password.trim();
    name = name.trim();

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, passwordHash, name, role: role || 'STAFF' },
      select: { id: true, username: true, name: true, role: true, isActive: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Username already exists' });
    next(err);
  }
});

usersRouter.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    let { name, role, isActive, password } = req.body;
    const data = {};
    if (name) data.name = name.trim();
    if (role) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    
    if (password && password.trim()) {
      data.passwordHash = await bcrypt.hash(password.trim(), 12);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
      select: { id: true, username: true, name: true, role: true, isActive: true },
    });
    res.json(user);
  } catch (err) { next(err); }
});

usersRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
});
