
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { supabase } from './supabaseClient.js';
import { requireAuth } from './authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

/*const supabase = createClient(process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {auth: {persistSession: false}}
)*/

app.use(express.json())
app.use(cors()); //NEBEZPECNY, JEN NA TESTOVANI------------------------------------

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 60, // max 60 requestů za minutu na IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/', async (req, res) => {
  console.log("je tu");
    res.json({ message: 'Server is running'})
    
})

app.get('ahoj', async (req,res) => {
  console.log("test nice");
});

app.get('/api/motives',(req,res)=>{
  console.log("motivy");
return res.status(200).json({message: [{"name": "umpalumpa", "starting_price": 20.6, "image_url": ""},{"name": "fasdfasd", "starting_price": 405, "image_url": ""}]});
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

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`)
})
