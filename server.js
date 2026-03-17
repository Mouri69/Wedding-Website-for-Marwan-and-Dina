require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Supabase ─────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Middleware ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ════════════════════════════════════════════════════════
//  RSVP ROUTES
// ════════════════════════════════════════════════════════

// Get all RSVPs
app.get('/api/rsvps', async (req, res) => {
  const { data, error } = await supabase
    .from('rsvps')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Submit a new RSVP
app.post('/api/rsvps', async (req, res) => {
  const { name, answer } = req.body;

  if (!name || !answer)
    return res.status(400).json({ error: 'name and answer are required' });

  if (!['yes', 'maybe', 'no'].includes(answer))
    return res.status(400).json({ error: 'answer must be yes, maybe, or no' });

  const { data, error } = await supabase
    .from('rsvps')
    .insert({ name: name.trim(), answer })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ════════════════════════════════════════════════════════
//  MESSAGE ROUTES
// ════════════════════════════════════════════════════════

// Get all messages
app.get('/api/messages', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Submit a new message
app.post('/api/messages', async (req, res) => {
  const { name, message } = req.body;

  if (!name || !message)
    return res.status(400).json({ error: 'name and message are required' });

  const { data, error } = await supabase
    .from('messages')
    .insert({ name: name.trim(), message: message.trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ════════════════════════════════════════════════════════
//  DRAWING ROUTES
// ════════════════════════════════════════════════════════

// Get all drawings sorted by votes
app.get('/api/drawings', async (req, res) => {
  const { data, error } = await supabase
    .from('drawings')
    .select('*')
    .order('votes', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Submit a new drawing
app.post('/api/drawings', async (req, res) => {
  const { name, image_data } = req.body;

  if (!name || !image_data)
    return res.status(400).json({ error: 'name and image_data are required' });

  if (!image_data.startsWith('data:image/'))
    return res.status(400).json({ error: 'image_data must be a base64 image' });

  const { data, error } = await supabase
    .from('drawings')
    .insert({ name: name.trim(), image_data, votes: 0 })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Vote for a drawing
app.post('/api/drawings/:id/vote', async (req, res) => {
  const { id } = req.params;

  // Get current vote count first
  const { data: current, error: fetchErr } = await supabase
    .from('drawings')
    .select('votes')
    .eq('id', id)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  // Then increment it
  const { data, error } = await supabase
    .from('drawings')
    .update({ votes: (current.votes || 0) + 1 })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ════════════════════════════════════════════════════════
//  CATCH-ALL — serve the frontend for any other route
// ════════════════════════════════════════════════════════
app.get('/{*any}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🌸  Wedding invitation running at http://localhost:${PORT}\n`);
  });
}

module.exports = app;