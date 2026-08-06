import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zaxnwqyrdkbquvtkqvyd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck'

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedDemoData() {
  console.log('🌱 Starting demo stores seeding...')

  // 1. Fetch Platform Categories to link stores
  const { data: pCats } = await supabase.from('platform_categories').select('*')
  const catSupermarket = pCats?.find(c => c.name.includes('سوبرماركت') || c.name.includes('ماركت'))?.id || pCats?.[0]?.id
  const catClothing = pCats?.find(c => c.name.includes('ألبسة') || c.name.includes('ملابس'))?.id || pCats?.[0]?.id
  const catOther = pCats?.find(c => c.name.includes('خدمات') || c.name.includes('الكل'))?.id || pCats?.[0]?.id

  // 2. Supermarket Store
  const { data: store1, error: err1 } = await supabase.from('restaurants').upsert({
    name: 'سوبرماركت الخير والبركة 🛒',
    slug: 'alkhair-market',
    primary_color: '#16a34a',
    whatsapp_number: '+905359998877',
    logo_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300&auto=format&fit=crop',
    cover_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop',
    latitude: 40.8175,
    longitude: 29.3760,
    delivery_radius_km: 10,
    store_type: 'supermarket',
    has_delivery: true
  }, { onConflict: 'slug' }).select().single()

  if (err1) console.error('Error seeding supermarket:', err1)
  else console.log('✅ Supermarket seeded:', store1.name)

  if (store1) {
    if (catSupermarket) {
      await supabase.from('restaurant_platform_categories').upsert({
        restaurant_id: store1.id,
        platform_category_id: catSupermarket
      }, { onConflict: 'restaurant_id,platform_category_id' })
    }

    // Add supermarket categories
    const { data: c1 } = await supabase.from('categories').insert([
      { restaurant_id: store1.id, name: '🧀 الأجبان والعروض الطازجة', sort_order: 1 },
      { restaurant_id: store1.id, name: '🧃 المشروبات والعصائر', sort_order: 2 }
    ]).select()

    if (c1 && c1.length > 0) {
      await supabase.from('menu_items').insert([
        {
          category_id: c1[0].id,
          name: 'زيت زيتون بكر ممتاز 1 لتر',
          description: 'زيت زيتون عصارة أولى فاخر عالي الجودة',
          price: 145,
          original_price: 195,
          image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop',
          is_available: true,
          is_offer: true,
          offer_title: 'خصم %25 🏷️'
        },
        {
          category_id: c1[0].id,
          name: 'جبنة موزاريلا كاسر 500غ',
          description: 'جبنة كاسر مبشورة للبيتزا والمعجنات',
          price: 85,
          original_price: 110,
          image_url: 'https://images.unsplash.com/photo-1552767059-ce182ead8c1b?w=500&auto=format&fit=crop',
          is_available: true,
          is_offer: true,
          offer_title: 'توفير ممتاز 🔥'
        },
        {
          category_id: c1[1]?.id || c1[0].id,
          name: 'عصير برتقال طبيعي 1 لتر',
          description: 'عصير برتقال 100% طازج بدون سكر مضاف',
          price: 45,
          original_price: 60,
          image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop',
          is_available: true,
          is_offer: true
        }
      ])
    }
  }

  // 3. Clothing Store
  const { data: store2, error: err2 } = await supabase.from('restaurants').upsert({
    name: 'بوتيك رويال للموضة والأزياء 👗',
    slug: 'royal-boutique',
    primary_color: '#db2777',
    whatsapp_number: '+905358887766',
    logo_url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300&auto=format&fit=crop',
    cover_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop',
    latitude: 40.8160,
    longitude: 29.3780,
    delivery_radius_km: 15,
    store_type: 'clothing',
    has_delivery: true
  }, { onConflict: 'slug' }).select().single()

  if (err2) console.error('Error seeding clothing store:', err2)
  else console.log('✅ Clothing store seeded:', store2.name)

  if (store2) {
    if (catClothing) {
      await supabase.from('restaurant_platform_categories').upsert({
        restaurant_id: store2.id,
        platform_category_id: catClothing
      }, { onConflict: 'restaurant_id,platform_category_id' })
    }

    const { data: c2 } = await supabase.from('categories').insert([
      { restaurant_id: store2.id, name: '✨ تشكيلة الفساتين والملابس النسائية', sort_order: 1 },
      { restaurant_id: store2.id, name: '👔 الأطقم والملابس الرسمية', sort_order: 2 }
    ]).select()

    if (c2 && c2.length > 0) {
      await supabase.from('menu_items').insert([
        {
          category_id: c2[0].id,
          name: 'فستان سهرة كلاسيكي مخمل',
          description: 'فستان سهرة فخم قماش مخمل راقي متوفر بجميع القياسات (S, M, L, XL)',
          price: 750,
          original_price: 980,
          image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop'
          ],
          is_available: true,
          is_offer: true,
          offer_title: 'تشكيلة الموسم ✨'
        },
        {
          category_id: c2[0].id,
          name: 'عباية أنيقة بتطريز يدوي',
          description: 'عباية كلاسيكية خامة ملكية مع شال مطابق بتطريز فاخر',
          price: 590,
          original_price: 720,
          image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop'
          ],
          is_available: true,
          is_offer: false
        },
        {
          category_id: c2[1]?.id || c2[0].id,
          name: 'قميص رجالي رسمـي كتان',
          description: 'قميص كاجوال ورسمي كتان طبيعي 100% مريح للغاية',
          price: 390,
          original_price: 490,
          image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop',
          images: [
            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=500&auto=format&fit=crop'
          ],
          is_available: true,
          is_offer: true
        }
      ])
    }
  }

  // 4. General Store
  const { data: store3, error: err3 } = await supabase.from('restaurants').upsert({
    name: 'عالم التكنولوجيا والإلكترونيات 📱',
    slug: 'tech-world',
    primary_color: '#2563eb',
    whatsapp_number: '+905357776655',
    logo_url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=300&auto=format&fit=crop',
    cover_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop',
    latitude: 40.8150,
    longitude: 29.3740,
    delivery_radius_km: 12,
    store_type: 'other',
    has_delivery: true
  }, { onConflict: 'slug' }).select().single()

  if (err3) console.error('Error seeding tech store:', err3)
  else console.log('✅ Tech store seeded:', store3.name)

  if (store3) {
    if (catOther) {
      await supabase.from('restaurant_platform_categories').upsert({
        restaurant_id: store3.id,
        platform_category_id: catOther
      }, { onConflict: 'restaurant_id,platform_category_id' })
    }

    const { data: c3 } = await supabase.from('categories').insert([
      { restaurant_id: store3.id, name: '🎧 الإكسسوارات والسماعات', sort_order: 1 }
    ]).select()

    if (c3 && c3.length > 0) {
      await supabase.from('menu_items').insert([
        {
          category_id: c3[0].id,
          name: 'ساعة ذكية رياضية Smart Watch Pro',
          description: 'ساعة مقاومة للماء مع قياس ضربات القلب والأنشطة الرياضية وشاشة OLED',
          price: 490,
          original_price: 650,
          image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop',
          is_available: true,
          is_offer: true,
          offer_title: '🔥 عرض خاص'
        },
        {
          category_id: c3[0].id,
          name: 'سماعات بلوتوث لاسلكية VIP',
          description: 'عزل ضوضاء ممتاز، بطارية تدوم حتى 24 ساعة وصوت نقـي جداً',
          price: 320,
          original_price: 420,
          image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop',
          is_available: true,
          is_offer: true
        }
      ])
    }
  }

  // 5. Special Offers Seeding
  console.log('🎉 Seeding Special Offers (العروض)...')

  // Find a restaurant item for restaurant offer
  const { data: rStores } = await supabase.from('restaurants').select('*').eq('store_type', 'restaurant').limit(1)
  if (rStores && rStores.length > 0) {
    const rStore = rStores[0]
    const { data: rItems } = await supabase.from('menu_items').select('*').eq('restaurant_id', rStore.id).limit(2)
    if (rItems && rItems.length > 0) {
      await supabase.from('offers').insert([
        {
          restaurant_id: rStore.id,
          primary_item_id: rItems[0].id,
          min_quantity: 2,
          bonus_item_id: rItems[1]?.id || rItems[0].id,
          bonus_quantity: 1,
          title: '🔥 عرض العائلة المميز من الأصيل',
          description: 'احصل على 2 وجبة مشاوي مشكل + وجبة مقبلات هدية مجاناً!',
          original_price: 450,
          offer_price: 350,
          image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop',
          is_active: true
        }
      ])
    }
  }

  if (store1) {
    const { data: sItems } = await supabase.from('menu_items').select('*').eq('restaurant_id', store1.id).limit(2)
    if (sItems && sItems.length > 0) {
      await supabase.from('offers').insert([
        {
          restaurant_id: store1.id,
          primary_item_id: sItems[0].id,
          min_quantity: 1,
          bonus_item_id: sItems[1]?.id || sItems[0].id,
          bonus_quantity: 1,
          title: '🛒 بكج التوفير العائلي من سوبرماركت الخير',
          description: 'اشترِ زيت زيتون بكر ممتاز واحصل على جبنة كاسر مجاناً!',
          original_price: 305,
          offer_price: 199,
          image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop',
          is_active: true
        }
      ])
    }
  }

  console.log('🚀 Seeding completed successfully!')
}

seedDemoData().catch(console.error)
