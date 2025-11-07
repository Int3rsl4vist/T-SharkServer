
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

import { supabase, supabaseAdmin } from './supabaseClient.js';
import { requireAuth } from './authMiddleware.js';
const upload = multer();
const app = express();
app.set('trust proxy', true);


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

/*
const supabase = createClient(process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {auth: {persistSession: false}}
)*/

app.use(express.json())
app.use(cors({
  origin: '*', // ⚠️ jen pro testování, pak nahraď URL své Flutter appky
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 60, // max 60 requestů za minutu na IP
  standardHeaders: true,
  legacyHeaders: false,
});
//app.use(limiter);
app.get('/test', (req, res) => res.send('OK'));
app.get('/', async (req, res) => {
  console.log("je tu");
    res.json({ message: 'Server is running'})
    
})

app.get('/ahoj', (req, res) => {
  console.log("test nice");
  res.send("Ahoj!");
});
/*app.get('/api/test-token', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      user: data?.user || null,
      message: data?.user ? 'Token je platný' : 'Token neplatný nebo expirovaný'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/upload_image', upload.single('file'), async (req, res) => {
  try {
    const { motive_id } = req.body;         // motiv ID z formuláře
    const file = req.file;                   // soubor poslaný klientem

    if (!file) return res.status(400).json({ error: 'Soubor nebyl zaslán' });

    // Načtení motivName z DB podle motive_id
    const { data: motiveData, error: motiveError } = await supabase
      .from('motive')
      .select('name')
      .eq('id', motive_id)
      .single();

    if (motiveError || !motiveData) {
      return res.status(400).json({ error: 'Motiv nenalezen' });
    }

    const motivName = motiveData.name;

    // Vygenerování unikátního názvu souboru
    const fileExt = file.originalname.split('.').pop(); // získá příponu
    const fileId = uuidv4();
    const storagePath = `${motivName}/${fileId}.${fileExt}`;

    // Upload do Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('Images')
      .upload(storagePath, file.buffer, { upsert: true });

    if (uploadError) {
      return res.status(500).json({ error: 'Chyba při nahrávání souboru' });
    }

    // Zavolání RPC funkce pro vložení do DB
    const { data, error } = await supabase.rpc('create_image', {
      p_motive_id: motive_id,
      p_path: storagePath
    });

    if (error) return res.status(500).json({ error: 'Chyba při vkládání do DB' });

    res.status(200).json({ dbData: data, storagePath });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/api/get_motives', async (req, res) => {
  try {
    // limit je volitelný, default 10
    const limit = parseInt(req.query.limit) || 10;

    // volání Supabase RPC funkce get_motives (vrací JSONB)
    const { data, error } = await supabaseAdmin.rpc('get_motives', { limit_count: limit });

    if (error) {
      console.error('Supabase RPC error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ motives: data }); // rovnou posíláme klientovi
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/api/get_image/:id', async (req, res) => {
  try {
    const imageId = req.params.id;

    const { data: imageData, error: imageError } = await supabase
      .from('obrazek')
      .select('*')
      .eq('id', imageId)
      .single();

    if (imageError || !imageData) {
      return res.status(404).json({ error: 'Obrázek nenalezen' });
    }

    const storagePath = imageData.path;

    const { publicURL, error: urlError } = supabase.storage
      .from('Images')
      .getPublicUrl(storagePath);

    if (urlError) {
      console.error(urlError);
      return res.status(500).json({ error: 'Chyba při generování URL' });
    }

    res.status(200).json({
      image: imageData,
      url: publicURL
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.get('/api/image/file/:id', async (req, res) => {
  try {
    const imageId = req.params.id;

    const { data: imageData, error: imageError } = await supabase
      .from('obrazek')
      .select('*')
      .eq('id', imageId)
      .single();

    if (imageError || !imageData) {
      return res.status(404).json({ error: 'Obrázek nenalezen' });
    }

    const storagePath = imageData.path;

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('Images')
      .download(storagePath);

    if (downloadError) {
      console.error(downloadError);
      return res.status(500).json({ error: 'Chyba při stahování souboru' });
    }

    res.setHeader('Content-Type', 'image/jpeg'); // uprav podle typu souboru
    res.send(Buffer.from(await fileData.arrayBuffer()));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
app.post('/api/order', requireAuth,async (req, res) => {
  // req.body → data z POST requestu
  console.log(req.body)

  // destrukturalizace proměnných z těla requestu
  const { 
    p_product_ids, 
    p_status, 
    p_time_paid, 
    p_tshirt_customtext, 
    p_tshirt_size, 
    p_user_id
  } = req.body
const userID = req.user.id
  try {
    const { data, error } = await supabase
      .rpc('create_order', {
        p_product_ids, 
        p_status, 
        p_time_paid, 
        p_tshirt_customtext, 
        p_tshirt_size, 
        p_user_id: userID
      })

    if (error) {
      console.error(error)
      return res.status(400).json({ error: error.message })
    }

    console.log(data)
    res.json({ message: 'Funkce create_order zavolána', data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/order', requireAuth,async (req, res) => {
  try {
    const userID = req.user.id
    const { data: order, error } = await supabase
      .from('order')
      .select('*')
      .eq('user_id', userID)
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.status(200).json(order)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})
*/

