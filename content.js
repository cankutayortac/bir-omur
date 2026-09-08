/* Bir Ömür — özgün, koşullara bağlı yaşam içerikleri. Bütün para değerleri TL'dir. */
(function (root) {
  'use strict';
  const actions = [
    { id: 'play', name: 'Hayal oyunları', description: 'Oyuncaklarınla bir dünya kur. Küçük yaşta merak ve güven kazan.', icon: '🧸', category: 'creative', minAge: 0, maxAge: 8, energy: 1, perYear: 2, effects: { happiness: 7, knowledge: 2 } },
    { id: 'family_story', name: 'Aile hikâyelerini dinle', description: 'Ailenin geçmişini öğren, aranızdaki bağı güçlendir.', icon: '📖', category: 'social', minAge: 0, energy: 1, perYear: 2, effects: { knowledge: 2, happiness: 4, bond: 4 } },
    { id: 'library', name: 'Halk kütüphanesi', description: 'Ücretsiz kaynaklarla çalış. Okuldaysan notlarına da katkı sağlar.', icon: '📚', category: 'learning', minAge: 6, energy: 1, perYear: 2, effects: { knowledge: 4, grade: 3, stress: -2 }, meetChance: 0.18 },
    { id: 'read', name: 'Kitap okuma saati', description: 'Kendi kitaplığında bir konuya derinlemesine odaklan.', icon: '📕', category: 'learning', minAge: 5, energy: 1, perYear: 2, requires: { items: ['book'] }, effects: { knowledge: 6, happiness: 2, stress: -3 } },
    { id: 'study', name: 'Düzenli ders çalış', description: 'Notların yükselir; yoğun çalışma biraz stres yaratır.', icon: '✏️', category: 'learning', minAge: 6, energy: 1, perYear: 2, requires: { school: true }, effects: { knowledge: 5, grade: 9, stress: 4 } },
    { id: 'study_group', name: 'Çalışma grubu', description: 'Soruları birlikte çöz; sınıfından yeni insanlarla tanışabilirsin.', icon: '📝', category: 'learning', minAge: 10, maxAge: 27, energy: 1, perYear: 2, requires: { school: true }, effects: { grade: 6, knowledge: 3 }, meetChance: 0.42 },
    { id: 'code', name: 'Kişisel yazılım projesi', description: 'Bilgisayarınla küçük bir uygulama geliştir. Zekânı ve iş performansını geliştirir.', icon: '💻', category: 'learning', minAge: 12, energy: 2, perYear: 2, requires: { items: ['laptop'], stats: { knowledge: 25 } }, effects: { knowledge: 9, performance: 4, stress: 3, flag: 'portfolio' } },
    { id: 'language', name: 'Dil pratiği', description: 'Ücretsiz konuşma grubunda kendini ifade etmeyi öğren.', icon: '🌍', category: 'learning', minAge: 12, energy: 1, perYear: 2, effects: { knowledge: 3 }, meetChance: 0.3 },
    { id: 'debate', name: 'Münazara kulübü', description: 'İddianı kaynaklarla savun; iletişim becerin ve zekân birlikte gelişir.', icon: '🎙️', category: 'social', minAge: 13, maxAge: 30, energy: 1, perYear: 2, requires: { stats: { knowledge: 25 } }, effects: { knowledge: 3, happiness: 2 }, meetChance: 0.36 },
    { id: 'socialize', name: 'Mahallede sosyalleş', description: 'Bir yürüyüş, kısa bir sohbet… Yeni bir arkadaşlığın başlangıcı olabilir.', icon: '👋', category: 'social', minAge: 5, energy: 1, perYear: 2, effects: { happiness: 5, stress: -3 }, meetChance: 0.55 },
    { id: 'cafe', name: 'Kafede buluş', description: 'Arkadaş çevreni genişlet. Harcaman tek bir buluşmanın ücretidir.', icon: '☕', category: 'social', minAge: 16, energy: 1, cost: 650, perYear: 2, effects: { happiness: 6, stress: -4 }, meetChance: 0.5 },
    { id: 'volunteer', name: 'Gönüllü çalış', description: 'Mahalle dayanışmasına katıl; birlikte çalıştığın insanlarla bağ kur.', icon: '🤲', category: 'social', minAge: 12, energy: 1, perYear: 2, effects: { happiness: 5, knowledge: 2, flag: 'volunteer' }, meetChance: 0.45 },
    { id: 'community', name: 'Topluluk etkinliği', description: 'Yerel bir etkinliğe katıl. Yetişkinlikte yeni dostluklara alan aç.', icon: '🎟️', category: 'social', minAge: 18, energy: 1, cost: 400, perYear: 2, effects: { happiness: 4 }, meetChance: 0.6 },
    { id: 'walk', name: 'Açık havada yürü', description: 'Ücretsiz, hafif egzersiz. Stresi azaltır ve sağlığını korur.', icon: '🌿', category: 'outdoors', minAge: 3, energy: 1, perYear: 2, effects: { health: 4, strength: 2, stress: -7, happiness: 3 }, meetChance: 0.15 },
    { id: 'run', name: 'Koşu antrenmanı', description: 'Spor ayakkabınla düzenli koş. Sağlığın 30 veya üzeri olmalı.', icon: '👟', category: 'outdoors', minAge: 8, energy: 1, perYear: 2, requires: { items: ['shoes'], stats: { health: 30 } }, effects: { strength: 6, health: 4, stress: -4 }, meetChance: 0.22 },
    { id: 'cycle', name: 'Bisiklet rotası', description: 'Bisikletinle şehir dışına çık; kondisyon ve keyif birlikte artar.', icon: '🚲', category: 'outdoors', minAge: 10, energy: 1, perYear: 2, requires: { items: ['bike'], stats: { health: 30 } }, effects: { strength: 7, health: 4, happiness: 5 }, meetChance: 0.25 },
    { id: 'gym', name: 'Spor salonu programı', description: 'Kısa bir antrenman programına katıl; kuvvetini disiplinle artır.', icon: '🏋️', category: 'health', minAge: 16, energy: 1, cost: 1500, perYear: 2, requires: { items: ['shoes'], stats: { health: 35 } }, effects: { strength: 8, health: 4, stress: -4 }, meetChance: 0.28 },
    { id: 'swim', name: 'Belediye havuzunda yüz', description: 'Eklemleri zorlamadan hareket et. İleri yaşta da yapılabilir.', icon: '🏊', category: 'health', minAge: 7, energy: 1, cost: 300, perYear: 2, effects: { strength: 4, health: 5, stress: -5 }, meetChance: 0.18 },
    { id: 'rest', name: 'Kendine zaman ayır', description: 'Dinlenmek de yıllık zamanından bir pay alır. Sağlığını ve ruh hâlini toparla.', icon: '🛌', category: 'health', minAge: 0, energy: 1, perYear: 2, effects: { health: 5, happiness: 3, stress: -12 } },
    { id: 'meditate', name: 'Nefes ve farkındalık', description: 'Sakin bir rutin oluştur; stres döngüsünü kır.', icon: '🧘', category: 'health', minAge: 12, energy: 1, perYear: 2, effects: { stress: -14, happiness: 3, health: 2 } },
    { id: 'doctor', name: 'Doktor muayenesi', description: 'Muayene ol; geçici rahatsızlıkları tedavi ettir, kronik hastalıkları kontrol altında tut.', icon: '🩺', category: 'health', minAge: 0, energy: 1, cost: 1500, perYear: 2, special: 'treatment', effects: { health: 13, stress: -5 } },
    { id: 'public_clinic', name: 'Aile sağlığı merkezi', description: 'Ücretsiz temel muayene. Randevu ve takip için daha çok zaman ayırırsın.', icon: '🏥', category: 'health', minAge: 0, energy: 2, perYear: 1, special: 'treatment', effects: { health: 9, stress: -3 } },
    { id: 'therapy', name: 'Psikolojik destek', description: 'Bir uzmanla düşüncelerini konuş; kaygı ve stresle başa çık.', icon: '💬', category: 'health', minAge: 12, energy: 1, cost: 1800, perYear: 2, effects: { stress: -20, happiness: 7, health: 3, clearFlag: 'unresolved_conflict' } },
    { id: 'cook', name: 'Evde dengeli yemek', description: 'Mutfak ekipmanlarınla sağlıklı bir rutin kur.', icon: '🥘', category: 'health', minAge: 16, energy: 1, cost: 350, perYear: 2, requires: { items: ['cookware'] }, effects: { health: 7, happiness: 4, knowledge: 2 } },
    { id: 'part_time', name: 'Günlük ek iş', description: 'Güvenli, kısa süreli bir işten gelir kazan. Zaman ve yorgunluk bedeli var; brüt kazanç aşağıda gösterilir.', icon: '📦', category: 'work', minAge: 16, energy: 2, perYear: 2, effects: { money: 3200, stress: 7, health: -2, knowledge: 1 }, meetChance: 0.22 },
    { id: 'freelance', name: 'Serbest proje', description: 'Bilgisayarın ve portföyünle ücretli iş yap. Brüt gelir ekonominin durumuna göre değişir.', icon: '🧑‍💻', category: 'work', minAge: 18, energy: 2, perYear: 2, requires: { items: ['laptop'], stats: { knowledge: 45 }, flags: ['portfolio'] }, effects: { money: 9000, knowledge: 3, stress: 8 }, meetChance: 0.22 },
    { id: 'overtime', name: 'Ek sorumluluk al', description: 'İş performansını geliştir; yükselme şansın artsın.', icon: '📈', category: 'work', minAge: 18, energy: 2, perYear: 2, requires: { job: true }, effects: { performance: 14, knowledge: 2, stress: 11, happiness: -3 } },
    { id: 'network', name: 'Mesleki buluşma', description: 'Sektöründeki insanlarla tanış; konuşma becerini ve performansını artır.', icon: '🤝', category: 'work', minAge: 18, energy: 1, cost: 900, perYear: 2, requires: { job: true }, effects: { performance: 6 }, meetChance: 0.55 },
    { id: 'public_aid', name: 'Sosyal destek başvurusu', description: 'İşsiz ve birikimin düşükse bu yıl tek seferlik acil destek isteyebilirsin. Güncel destek tutarı aşağıda gösterilir.', icon: '🧾', category: 'work', minAge: 18, energy: 2, perYear: 1, special: 'aid', requires: { cashBelow: 15000, job: false }, effects: { money: 6000, stress: -4 } },
    { id: 'driving_school', name: 'Ehliyet kursu', description: 'Direksiyon eğitimini ve sınavı tamamla. Otomobil satın almayı açar.', icon: '🚦', category: 'learning', minAge: 18, energy: 2, cost: 12000, perYear: 1, requires: { notFlags: ['driver_license'] }, effects: { knowledge: 2, flag: 'driver_license' } },
    { id: 'music', name: 'Enstrüman çalış', description: 'Gitarınla yeni bir parça öğren; sahne için özgüven kazan.', icon: '🎸', category: 'creative', minAge: 8, energy: 1, perYear: 2, requires: { items: ['guitar'] }, effects: { happiness: 6, stress: -6, flag: 'musician' }, meetChance: 0.15 },
    { id: 'paint', name: 'Çizim günlüğü', description: 'Çizim setinle çevrene başka bir gözle bak.', icon: '🎨', category: 'creative', minAge: 5, energy: 1, perYear: 2, requires: { items: ['art_kit'] }, effects: { happiness: 6, knowledge: 3, stress: -6 }, meetChance: 0.12 },
    { id: 'photography', name: 'Fotoğraf yürüyüşü', description: 'Fotoğraf makinenle hikâyeler yakala ve meraklılarla tanış.', icon: '📷', category: 'creative', minAge: 14, energy: 1, perYear: 2, requires: { items: ['camera'] }, effects: { happiness: 6, knowledge: 2 }, meetChance: 0.35 },
    { id: 'perform', name: 'Açık mikrofon gecesi', description: 'Gitarınla sahneye çık. Küçük bir ücret ve bolca özgüven kazan.', icon: '🎤', category: 'creative', minAge: 16, energy: 2, perYear: 1, requires: { items: ['guitar'], stats: {  } }, effects: { money: 1600, happiness: 5, stress: 3 }, meetChance: 0.48 },
    { id: 'garden', name: 'Balkon bahçesi', description: 'Küçük bahçe setinle bir şeyler yetiştir. Her yaşta huzur veren bir uğraş.', icon: '🪴', category: 'outdoors', minAge: 10, energy: 1, perYear: 2, requires: { items: ['garden_kit'] }, effects: { health: 3, knowledge: 3, happiness: 5, stress: -8 } },
    { id: 'mentor', name: 'Deneyimini paylaş', description: 'Gençlere ücretsiz yol göster; tecrüben başka birinin hayatına dokunsun.', icon: '🧑‍🏫', category: 'social', minAge: 45, energy: 1, perYear: 2, requires: { stats: { knowledge: 45 } }, effects: { happiness: 7, stress: -4 }, meetChance: 0.4 },
    { id: 'memoir', name: 'Anılarını yaz', description: 'Bilgisayarında yaşamından sayfalar biriktir.', icon: '🖋️', category: 'creative', minAge: 50, energy: 1, perYear: 2, requires: { items: ['laptop'] }, effects: { knowledge: 3, happiness: 6, stress: -7, flag: 'memoir' } }
  ];

  const items = [
    { id: 'book', name: 'Küçük kitaplık', icon: '📚', category: 'learning', price: 500, minAge: 4, description: 'Kitap okuma eylemini açar. Bir kere al, yıllarca oku.', bonus: { knowledge: 2 }, conditionLoss: 0, maintenance: 0 },
    { id: 'shoes', name: 'Spor ayakkabısı', icon: '👟', category: 'health', price: 1800, minAge: 7, description: 'Koşu ve spor salonu için gerekir.', bonus: { strength: 1 }, conditionLoss: 14, maintenance: 0 },
    { id: 'bike', name: 'Şehir bisikleti', icon: '🚲', category: 'outdoors', price: 9000, minAge: 10, description: 'Bisiklet rotalarını açar. Yıllık bakım giderini de bütçene kat.', bonus: { strength: 2 }, conditionLoss: 8, maintenance: 450 },
    { id: 'laptop', name: 'Dizüstü bilgisayar', icon: '💻', category: 'learning', price: 24000, minAge: 12, description: 'Yazılım projesi, serbest çalışma ve anı yazmayı açar.', bonus: { knowledge: 3 }, conditionLoss: 9, maintenance: 900 },
    { id: 'guitar', name: 'Akustik gitar', icon: '🎸', category: 'creative', price: 5500, minAge: 8, description: 'Müzik çalışmayı ve açık mikrofon sahnesini açar.', bonus: { happiness: 2 }, conditionLoss: 5, maintenance: 200 },
    { id: 'art_kit', name: 'Çizim seti', icon: '🎨', category: 'creative', price: 900, minAge: 5, description: 'Çizim günlüğünü açar. Zamanla malzemeler tükenir.', bonus: { happiness: 2 }, conditionLoss: 18, maintenance: 0 },
    { id: 'camera', name: 'Fotoğraf makinesi', icon: '📷', category: 'creative', price: 16000, minAge: 14, description: 'Fotoğraf yürüyüşlerini açar.', bonus: { happiness: 2 }, conditionLoss: 7, maintenance: 300 },
    { id: 'cookware', name: 'Temel mutfak seti', icon: '🍳', category: 'health', price: 3500, minAge: 16, description: 'Evde dengeli yemek hazırlamayı açar.', bonus: { health: 2 }, conditionLoss: 5, maintenance: 0 },
    { id: 'garden_kit', name: 'Balkon bahçe seti', icon: '🪴', category: 'outdoors', price: 1200, minAge: 10, description: 'Bahçecilikle ilgilenmeyi açar.', bonus: { happiness: 2 }, conditionLoss: 12, maintenance: 120 },
    { id: 'suit', name: 'İş görüşmesi kıyafeti', icon: '👔', category: 'work', price: 6500, minAge: 16, description: 'İlk izlenimine küçük, tek seferlik katkı sağlar. Güzellik katkısı mevcut gelişimine göre azalır.', bonus: { charisma: 5 }, conditionLoss: 8, maintenance: 0 },
    { id: 'phone', name: 'Akıllı telefon', icon: '📱', category: 'social', price: 11000, minAge: 13, description: 'Yakınlarınla bağlantıda kalmanı sağlar. Bazı olaylarda seçenek açar.', bonus: { happiness: 2 }, conditionLoss: 13, maintenance: 600 },
    { id: 'toolkit', name: 'Tamir takımı', icon: '🧰', category: 'work', price: 2800, minAge: 16, description: 'Evdeki arızalarda masrafı azaltan seçenekler açar.', bonus: { knowledge: 2 }, conditionLoss: 4, maintenance: 0 },
    { id: 'car', name: 'İkinci el otomobil', icon: '🚗', category: 'work', price: 380000, minAge: 18, requires: { flags: ['driver_license'] }, description: 'Ehliyet gerekir. Satın alma dışında her yıl değişen bakım giderini bütçene kat.', bonus: { happiness: 5 }, conditionLoss: 6, maintenance: 24000 },
    { id: 'formal_watch', name: 'Kaliteli saat', icon: '⌚', category: 'social', price: 18000, minAge: 18, description: 'Görünümüne tek seferlik küçük katkı. Güzellik geliştikçe katkısı azalır; önce temel ihtiyaçlarını düşün.', bonus: { charisma: 3 }, conditionLoss: 4, maintenance: 0 },
    { id: 'medicine', name: 'Temel bakım paketi', icon: '🩹', category: 'health', price: 750, minAge: 0, consumable: true, special: 'medicine', description: 'Tek kullanım: sağlık +8. Hastalık tedavisinin yerine geçmez.', effects: { health: 8, stress: -2 }, bonus: {} },
    { id: 'vitamins', name: 'Dengeli beslenme paketi', icon: '🥗', category: 'health', price: 1200, minAge: 0, consumable: true, description: 'Tek kullanım: sağlık +5, mutluluk +3.', effects: { health: 5, happiness: 3 }, bonus: {} },
    { id: 'gift', name: 'Özenli hediye', icon: '🎁', category: 'social', price: 1200, minAge: 6, consumable: true, description: 'Kullanıldığında yakınlarınla bağını güçlendirir.', effects: { bond: 7, happiness: 2 }, bonus: {} },
    { id: 'holiday', name: 'Kısa tatil paketi', icon: '🏖️', category: 'health', price: 18000, minAge: 18, consumable: true, description: 'Tek kullanım: stres −22, mutluluk +14, sağlık +3.', effects: { stress: -22, happiness: 14, health: 3 }, bonus: {} },
    { id: 'apartment', name: 'Küçük şehir dairesi', icon: '🏡', category: 'property', price: 1800000, minAge: 18, description: 'Satın aldıktan sonra yaşam düzeninden kendi evine taşınabilirsin. Bakım gideri her yıl bütçene yansır.', bonus: { happiness: 8 }, conditionLoss: 0, maintenance: 12000 }
  ];

  const careers = [
    { id: 'cashier', name: 'Market görevlisi', icon: '🛒', description: 'Diploma ve stat şartı olmayan, işe kabulü kesin bir başlangıç.', salary: 240000, minAge: 18, guaranteed: true, requires: {} },
    { id: 'warehouse', name: 'Depo çalışanı', icon: '📦', description: 'Fiziksel dayanıklılık isteyen düzenli iş.', salary: 276000, minAge: 18, requires: { stats: { strength: 30, health: 40 } } },
    { id: 'barista', name: 'Barista', icon: '☕', description: 'Müşteri ilişkileri ve hızlı çalışma.', salary: 264000, minAge: 18, requires: { stats: {  } } },
    { id: 'receptionist', name: 'Resepsiyon görevlisi', icon: '🛎️', description: 'İletişim gücünü düzenli bir işe dönüştür.', salary: 288000, minAge: 18, requires: { stats: { knowledge: 20 } } },
    { id: 'sales', name: 'Satış temsilcisi', icon: '🤝', description: 'Hedef baskısı yüksek, ilerleme alanı geniş.', salary: 336000, minAge: 18, requires: { stats: { knowledge: 22 } } },
    { id: 'technician', name: 'Elektrik teknisyeni', icon: '🔧', description: 'Mesleki eğitimini sahada kullan.', salary: 384000, minAge: 18, requires: { degree: 'technical', stats: { knowledge: 36, strength: 25 } } },
    { id: 'chef', name: 'Aşçı', icon: '🧑‍🍳', description: 'Mutfak eğitimi ve tempolu çalışma gerektirir.', salary: 360000, minAge: 18, requires: { degree: 'culinary', stats: { knowledge: 30, health: 40 } } },
    { id: 'trainer', name: 'Spor eğitmeni', icon: '🏅', description: 'Kondisyonunu ve iletişimini mesleğe dönüştür.', salary: 372000, minAge: 18, requires: { degree: 'fitness', stats: { strength: 55, health: 60 } } },
    { id: 'designer', name: 'Görsel tasarımcı', icon: '🎨', description: 'Tasarım eğitimi ve bilgisayar gerekir.', salary: 432000, minAge: 18, requires: { degree: 'design', items: ['laptop'], stats: { knowledge: 40 } } },
    { id: 'accountant', name: 'Muhasebe uzmanı', icon: '🧮', description: 'İşletme mezunları için dikkat isteyen bir kariyer.', salary: 456000, minAge: 21, requires: { degree: 'business', stats: { knowledge: 50 } } },
    { id: 'teacher', name: 'Öğretmen', icon: '🧑‍🏫', description: 'Alan bilgisi kadar insanlarla bağ kurmayı da gerektirir.', salary: 480000, minAge: 21, requires: { degree: 'education', stats: { knowledge: 52 } } },
    { id: 'nurse', name: 'Hemşire', icon: '🩺', description: 'Sağlık eğitimi ve dayanıklılıkla insanlara destek ol.', salary: 504000, minAge: 21, requires: { degree: 'nursing', stats: { knowledge: 48, health: 50 } } },
    { id: 'developer', name: 'Yazılım geliştirici', icon: '💻', description: 'Bilgisayar mühendisliği mezunları için teknik bir kariyer.', salary: 600000, minAge: 21, requires: { degree: 'software', stats: { knowledge: 62 } } },
    { id: 'engineer', name: 'İnşaat mühendisi', icon: '🏗️', description: 'Planlama, teknik bilgi ve saha sorumluluğu.', salary: 564000, minAge: 21, requires: { degree: 'engineering', stats: { knowledge: 58 } } },
    { id: 'lawyer', name: 'Avukat', icon: '⚖️', description: 'Hukuk eğitimi, güçlü analiz ve ikna kabiliyeti gerekir.', salary: 660000, minAge: 22, requires: { degree: 'law', stats: { knowledge: 62 } } },
    { id: 'doctor', name: 'Hekim', icon: '🏥', description: 'Uzun eğitimin karşılığı; yüksek sorumluluk ve düzenli gelir.', salary: 900000, minAge: 24, requires: { degree: 'medicine', stats: { knowledge: 72, health: 45 } } }
  ];

  const courses = [
    { id: 'technical', name: 'Elektrik teknisyenliği', icon: '🔧', description: 'Bir yıllık mesleki program. Teknisyen ilanlarını açar.', degree: 'technical', duration: 1, annualCost: 12000, minAge: 18, requires: { stats: { knowledge: 25 } } },
    { id: 'culinary', name: 'Profesyonel mutfak', icon: '🍳', description: 'Bir yıllık meslek eğitimiyle aşçılığa hazırlan.', degree: 'culinary', duration: 1, annualCost: 16000, minAge: 18, requires: { stats: { knowledge: 20 } } },
    { id: 'fitness', name: 'Antrenörlük eğitimi', icon: '🏋️', description: 'Kuvvetini belgeli bir mesleğe dönüştür.', degree: 'fitness', duration: 1, annualCost: 14000, minAge: 18, requires: { stats: { strength: 42, health: 50 } } },
    { id: 'design', name: 'Görsel iletişim programı', icon: '🎨', description: 'İki yıllık uygulamalı tasarım eğitimi.', degree: 'design', duration: 2, annualCost: 18000, minAge: 18, requires: { stats: { knowledge: 32 } } },
    { id: 'business', name: 'İşletme lisansı', icon: '📊', description: 'Dört yıllık lisans; muhasebe ve yönetim kariyerine temel.', degree: 'business', duration: 4, annualCost: 22000, minAge: 18, requires: { stats: { knowledge: 38 } } },
    { id: 'education', name: 'Eğitim fakültesi', icon: '📚', description: 'Dört yıl boyunca alan bilgisi ve öğretmenlik becerileri.', degree: 'education', duration: 4, annualCost: 16000, minAge: 18, requires: { stats: { knowledge: 40 } } },
    { id: 'nursing', name: 'Hemşirelik lisansı', icon: '🩺', description: 'Dört yıllık sağlık eğitimi; uygulama ve teori bir arada.', degree: 'nursing', duration: 4, annualCost: 20000, minAge: 18, requires: { stats: { knowledge: 42, health: 40 } } },
    { id: 'software', name: 'Bilgisayar mühendisliği', icon: '💻', description: 'Dört yıllık lisans. Güçlü notlar burs şansını artırır.', degree: 'software', duration: 4, annualCost: 28000, minAge: 18, requires: { stats: { knowledge: 50 } } },
    { id: 'engineering', name: 'İnşaat mühendisliği', icon: '🏗️', description: 'Dört yıl matematik, yapı ve proje eğitimi.', degree: 'engineering', duration: 4, annualCost: 24000, minAge: 18, requires: { stats: { knowledge: 46 } } },
    { id: 'law', name: 'Hukuk fakültesi', icon: '⚖️', description: 'Dört yıllık yoğun okuma ve yorumlama programı.', degree: 'law', duration: 4, annualCost: 30000, minAge: 18, requires: { stats: { knowledge: 50 } } },
    { id: 'medicine', name: 'Tıp fakültesi', icon: '🏥', description: 'Altı yıllık uzun eğitim. Bütçeni ve çalışma düzenini planla.', degree: 'medicine', duration: 6, annualCost: 32000, minAge: 18, requires: { stats: { knowledge: 62 } } }
  ];

  // Skill experience is permanent; core-stat gains are scaled in LifeProgression.
  // One action is part of a yearly routine, not a button to repeat indefinitely.
  const actionPractice = {
    play: { creative: 5 }, family_story: { academic: 3, social: 3 },
    library: { academic: 8 }, read: { academic: 10 }, study: { academic: 10 },
    study_group: { academic: 7, social: 4 }, code: { academic: 16 },
    language: { academic: 5, social: 7 }, debate: { academic: 5, social: 10 },
    socialize: { social: 7 }, cafe: { social: 8 }, volunteer: { social: 10 }, community: { social: 10 },
    walk: { athletics: 4 }, run: { athletics: 10 }, cycle: { athletics: 11 }, gym: { athletics: 12 }, swim: { athletics: 8 },
    cook: { creative: 7 }, part_time: { social: 3 }, freelance: { academic: 12 }, overtime: { academic: 5 }, network: { social: 11 },
    driving_school: { academic: 4 }, music: { creative: 11 }, paint: { creative: 9 }, photography: { creative: 10 },
    perform: { creative: 16, social: 6 }, garden: { academic: 3, creative: 4 }, mentor: { social: 10, academic: 4 }, memoir: { creative: 12 }
  };
  for (const action of actions) action.skillXP = actionPractice[action.id] || {};
  actions.find(action => action.id === 'study').effects.grade = 5;
  actions.find(action => action.id === 'library').effects.grade = 1;
  actions.find(action => action.id === 'study_group').effects.grade = 3;
  actions.find(action => action.id === 'code').requires.skills = { academic: 1 };
  actions.find(action => action.id === 'freelance').requires.skills = { academic: 2 };
  actions.find(action => action.id === 'perform').requires.skills = { creative: 1 };
  actions.find(action => action.id === 'mentor').requires.skills = { social: 2 };
  actions.find(action => action.id === 'read').description = 'Kitaplığında derinleş. Araştırma deneyimi biriktir; aynı yıl ikinci tekrar daha az gelişim verir.';
  actions.find(action => action.id === 'study').description = 'Notlarına ve araştırma deneyimine yatırım yap. İyi bir okul sonucu için birkaç yıla yayılan bir çalışma düzeni kur.';
  actions.find(action => action.id === 'code').description = 'Araştırmada Temel düzey ve bilgisayar gerekir. İlk portföyünü oluştur; ücretli işler için Yetkin düzeye ilerle.';
  actions.find(action => action.id === 'freelance').description = 'Araştırmada Yetkin düzey, bilgisayar ve portföy gerekir. Güncel brüt gelir aşağıda gösterilir; zaman ve stres bedelini düşün.';

  actions.push({ id: 'exam_preparation', name: 'Eğitime dönüş hazırlığı', description: 'Eğitime yeniden başlamak için temel konuları toparla. Başvurulardaki başarı puanın artar; düşük okul notu hayat boyu kapıları kapatmaz.', icon: '📓', category: 'learning', minAge: 18, energy: 2, perYear: 2, requires: { items: ['book'], school: false }, skillXP: { academic: 10 }, effects: { knowledge: 4, grade: 6, stress: 4 } });

  actions.push(
    { id: 'personal_care', name: 'Kişisel bakım rutini', description: 'Kendine iyi gelen düzenli bakım alışkanlıkları edin. Güzellik yavaş gelişir; aynı yılın ikinci tekrarı daha az katkı verir.', icon: '🪞', category: 'health', minAge: 5, energy: 1, perYear: 2, skillXP: {}, effects: { charisma: 6, health: 2, happiness: 2, stress: -3 } },
    { id: 'skin_care', name: 'Özenli bakım günü', description: 'Bakım setinle kendine zaman ayır. Başkasına benzemek değil, kendini iyi hissetmek için.', icon: '🧴', category: 'health', minAge: 12, energy: 1, cost: 350, perYear: 2, requires: { items: ['care_kit'] }, skillXP: {}, effects: { charisma: 8, happiness: 3, stress: -4 } },
    { id: 'personal_style', name: 'Kendi stilini bul', description: 'Sana yakışan renk ve bakım düzenini keşfet. Aynadaki kişi aynı; ona ayırdığın özen farklı. Saç editörü yalnızca görünümü değiştirir.', icon: '✨', category: 'health', minAge: 16, energy: 1, cost: 1200, perYear: 1, skillXP: { creative: 5 }, effects: { charisma: 9, happiness: 4, stress: -2 } }
  );
  items.push({ id: 'care_kit', name: 'Kişisel bakım seti', icon: '🧴', category: 'health', price: 1600, minAge: 12, description: 'Özenli bakım gününü açar. Satın almak tek başına puan kazandırmaz; kullanmak için zaman ayırmalısın.', bonus: {}, conditionLoss: 15, maintenance: 0 });
  careers.push({ id: 'model', name: 'Katalog modeli', icon: '📸', description: 'Yetişkinler için ürün çekimleri. Bakımlı görünümün yanında set iletişimi ve düzenli çalışma gerekir.', salary: 312000, minAge: 18, requires: { stats: { charisma: 65, health: 40 }, skills: { social: 1 } } });

  actions.push(
    { id: 'research_notebook', name: 'Araştırma dosyası hazırla', description: 'Bir soruyu kaynak, karşılaştırma ve sonuçla incele. Bir defalık başarı rozeti ve kalıcı araştırma deneyimi kazan.', icon: '🔎', category: 'learning', minAge: 12, energy: 2, perYear: 1, requires: { items: ['book'], stats: { knowledge: 32 }, skills: { academic: 1 } }, skillXP: { academic: 24 }, project: { flag: 'research_dossier', title: 'İlk araştırma dosyan', text: 'Bir merakı somut bir çalışmaya dönüştürdün.' }, effects: { knowledge: 8, grade: 4, stress: 5, flag: 'research_dossier' } },
    { id: 'publish_project', name: 'Açık kaynak projesi yayımla', description: 'Yıllar içinde kurduğun uzmanlığı herkese açık bir projeye dönüştür. Portföyünü güçlendir, mesleğinde görünürlük kazan.', icon: '🧩', category: 'learning', minAge: 18, energy: 3, perYear: 1, requires: { items: ['laptop'], stats: { knowledge: 58 }, skills: { academic: 3 }, flags: ['portfolio'] }, skillXP: { academic: 40, social: 6 }, project: { flag: 'published_project', title: 'Bir fikrin artık dünyada', text: 'İlk açık kaynak projen yayımlandı. Öğrendiklerin başkaları için de değer üretiyor.' }, effects: { knowledge: 12, performance: 9, happiness: 5, stress: 8, flag: 'published_project' } },
    { id: 'race_training', name: 'İlk 10 kilometre hedefi', description: 'Yarış hazırlığını bir yıllık düzenli programa dönüştür. Spor Temel düzeyi ve sağlıklı bir beden gerekir.', icon: '🏁', category: 'outdoors', minAge: 14, energy: 2, perYear: 1, requires: { items: ['shoes'], stats: { strength: 32, health: 55 }, skills: { athletics: 1 } }, skillXP: { athletics: 25 }, project: { flag: 'first_race', title: 'Kendi sınırını aştın', text: 'İlk 10 kilometre hedefin tamamlandı. Sonucu tek bir gün değil, hazırlığın belirledi.' }, effects: { strength: 9, health: 3, happiness: 5, stress: 3, flag: 'first_race' } },
    { id: 'coach_team', name: 'Amatör takıma yol göster', description: 'Spor uzmanlığını bir takımla paylaş. İletişim ve performans geliştir; antrenörlük için somut deneyim edin.', icon: '🥇', category: 'outdoors', minAge: 20, energy: 2, perYear: 1, requires: { items: ['shoes'], stats: { strength: 55, health: 50 }, skills: { athletics: 3 } }, skillXP: { athletics: 32, social: 12 }, project: { flag: 'coached_team', title: 'Takımının ilk sezonu', text: 'Kendi antrenmanından fazlasını düşündün; bir ekibin gelişimine katkı verdin.' }, effects: { strength: 6, performance: 8, happiness: 5, flag: 'coached_team' }, meetChance: .4 },
    { id: 'creative_portfolio', name: 'İlk seçkini hazırla', description: 'Çizimlerini tek bir tema etrafında düzenle. Yaratıcılık Temel düzeyinden sergi hedefine doğru ilk somut adımını at.', icon: '🖼️', category: 'creative', minAge: 12, energy: 2, perYear: 1, requires: { items: ['art_kit'], skills: { creative: 1 } }, skillXP: { creative: 25 }, project: { flag: 'creative_portfolio', title: 'Dağınık eskizlerden bir seçki', text: 'İlk yaratıcı portföyünü tamamladın. Çalışmaların artık birlikte bir hikâye anlatıyor.' }, effects: { knowledge: 3, happiness: 5, stress: 3, flag: 'creative_portfolio' } },
    { id: 'community_exhibition', name: 'Topluluk sergisi düzenle', description: 'Uzman düzeyindeki çalışmalarını insanlarla paylaş. Bir seçki, ekipman ve dinleyiciyle iletişim becerisi gerekir.', icon: '🎭', category: 'creative', minAge: 18, energy: 3, perYear: 1, requires: { items: ['art_kit'], stats: {  }, skills: { creative: 3 }, flags: ['creative_portfolio'] }, skillXP: { creative: 40, social: 12 }, project: { flag: 'first_exhibition', title: 'İlk serginin kapıları açıldı', text: 'İnsanlar çalışmalarının önünde durup konuştu. Yaratıcılığın paylaşılan bir deneyime dönüştü.' }, effects: { happiness: 8, performance: 5, stress: 5, flag: 'first_exhibition' }, meetChance: .5 },
    { id: 'organize_volunteers', name: 'Dayanışma ekibi kur', description: 'Gönüllülük deneyimini küçük bir ekibe taşı. İş bölümü ve açık iletişimle birlikte bir hedef tamamla.', icon: '🫶', category: 'social', minAge: 14, energy: 2, perYear: 1, requires: { stats: {  }, skills: { social: 1 }, flags: ['volunteer'] }, skillXP: { social: 26 }, project: { flag: 'organized_team', title: 'Birlikte ilk işiniz', text: 'Küçük bir dayanışma ekibiyle söz verdiğiniz işi tamamladınız.' }, effects: { happiness: 5, stress: 3, flag: 'organized_team' }, meetChance: .45 },
    { id: 'facilitate_conflict', name: 'Uzlaşma atölyesi yönet', description: 'Farklı görüşleri dinleyip ortak bir çözüm üret. İletişim uzmanlığına ve önceden kurulmuş bir ekip deneyimine dayanır.', icon: '🕊️', category: 'social', minAge: 22, energy: 2, perYear: 1, requires: { stats: { knowledge: 35 }, skills: { social: 3 }, flags: ['organized_team'] }, skillXP: { social: 35, academic: 8 }, project: { flag: 'mediated_conflict', title: 'Ortak bir yol bulundu', text: 'Bir anlaşmazlıkta herkesin dinlendiği bir alan açtın; ekibin birlikte ilerleyebildi.' }, effects: { knowledge: 3, performance: 7, happiness: 4, flag: 'mediated_conflict' }, meetChance: .35 }
  );

  const careerSkills = { barista: { social: 1 }, receptionist: { social: 1 }, sales: { social: 1 }, technician: { academic: 1 }, chef: { creative: 1 }, trainer: { athletics: 2, social: 1 }, designer: { creative: 2 }, accountant: { academic: 2 }, teacher: { academic: 2, social: 1 }, nurse: { academic: 2 }, developer: { academic: 2 }, engineer: { academic: 2 }, lawyer: { academic: 2, social: 2 }, doctor: { academic: 3 } };
  for (const career of careers) if (careerSkills[career.id]) career.requires.skills = careerSkills[career.id];
  const admission = {
    technical: { knowledge: 25, minGrade: 35 }, culinary: { knowledge: 20, minGrade: 35 },
    fitness: { minGrade: 35 }, design: { knowledge: 30, minGrade: 45 },
    business: { knowledge: 36, minGrade: 55 }, education: { knowledge: 38, minGrade: 55 },
    nursing: { knowledge: 40, minGrade: 58 }, software: { knowledge: 45, minGrade: 65 },
    engineering: { knowledge: 43, minGrade: 60 }, law: { knowledge: 46, minGrade: 65 },
    medicine: { knowledge: 55, minGrade: 78 }
  };
  for (const course of courses) {
    course.minGrade = admission[course.id].minGrade;
    if (admission[course.id].knowledge) course.requires.stats.knowledge = admission[course.id].knowledge;
  }
  for (const item of items) {
    if (item.id === 'suit') item.description = 'İlk izlenimine küçük, tek seferlik katkı sağlar. Güzellik katkısı mevcut gelişimine göre azalır.';
    if (item.id === 'formal_watch') item.description = 'Görünümüne tek seferlik küçük katkı. Güzellik geliştikçe katkısı azalır; önce temel ihtiyaçlarını düşün.';
  }

  const choice = (label, outcome, effects, extra = {}) => ({ label, outcome, effects: effects || {}, ...extra });
  const event = (id, title, description, icon, minAge, maxAge, choices, extra = {}) => ({ id, title, description, icon, minAge, maxAge, choices, weight: 2, cooldown: 5, ...extra });
  const events = [
    event('first_steps', 'İlk küçük keşif', 'Sehpanın kenarına tutunup ayağa kalktın. Birkaç adım ötede en sevdiğin oyuncak duruyor.', '🧸', 1, 2, [
      choice('Oyuncağa doğru yürü', 'Dengeni arayarak birkaç adım attın. Ev alkışlarla doldu.', { strength: 3, happiness: 4 }),
      choice('Bir el uzatılmasını bekle', 'Ailenin elini tuttun; birlikte denemek sana güven verdi.', { bond: 4, happiness: 3, skillXP: { social: 2 } })
    ], { once: true }),
    event('new_food', 'Tabakta yeni bir renk', 'Önüne ilk kez hiç tanımadığın bir yemek geldi. Kokusu biraz tuhaf, ailen merakla seni izliyor.', '🥕', 1, 4, [
      choice('Küçük bir lokma dene', 'Yeni bir tadı keşfettin. Merakın iştahından büyük çıktı.', { knowledge: 2, health: 2 }),
      choice('Tanıdık yemeğini iste', 'Bildiğin tat sana iyi geldi; keşif başka güne kaldı.', { happiness: 3 })
    ]),
    event('night_fear', 'Karanlıktaki gölge', 'Gece duvarda kocaman bir gölge gördün. Odandaki mont olduğunu henüz bilmiyorsun.', '🌙', 2, 5, [
      choice('Ailene seslen', 'Işık açılınca gölge küçüldü. Korkunu paylaşabildin.', { bond: 4, stress: -4, happiness: 2 }),
      choice('Oyuncağına sarıl', 'Oyuncağın yanında uyudun. Sabah korkun kaybolmuştu.', { happiness: 3, stress: -2 })
    ]),
    event('playground_share', 'Kumdan kale', 'Parkta başka bir çocuk kalenin yanına kendi tünelini yapmak istiyor.', '🏖️', 3, 6, [
      choice('Birlikte büyük bir kale yap', 'İki küçük kale bir şehre dönüştü. Yeni bir oyun arkadaşı edindin.', { skillXP: { social: 6 }, happiness: 4, meet: 'friend' }),
      choice('Kendi bölümünü ayrı tut', 'Kendi kaleni bitirdin. Tek başına da eğlendin.', { knowledge: 2, happiness: 2 })
    ]),
    event('library_card', 'İlk kütüphane kartın', 'Çocuk kütüphanesinde görevli, resimli kitapları eve götürebileceğini söyledi.', '📚', 4, 7, [
      choice('Bir doğa kitabı seç', 'Evde sayfaları çevirip hayvanların isimlerini öğrendin.', { knowledge: 4, items: ['book'] }),
      choice('Hikâye saatine katıl', 'Masal dinlerken yanındaki çocukla sohbete başladın.', { skillXP: { social: 6 }, happiness: 3, meet: 'friend' })
    ], { once: true }),
    event('broken_vase', 'Kırılan vazo', 'Salonda top oynarken vazoyu devirdin. Sesleri duyan ailen odaya geliyor.', '🏺', 4, 8, [
      choice('Olanı dürüstçe anlat', 'Üzüldüler ama dürüstlüğünü takdir ettiler. Birlikte topladınız.', { bond: 4, skillXP: { social: 4 }, stress: -2 }),
      choice('Saklamaya çalış', 'Parçalar saklanmadı. Güveni yeniden kazanman gerekecek.', { bond: -5, stress: 4, flag: 'unresolved_conflict' })
    ]),
    event('first_school', 'Sınıfın kapısında', 'İlk okul gününde herkes birbirine yabancı. Öğretmenin boş bir sırayı gösteriyor.', '🎒', 6, 7, [
      choice('Yanındaki çocuğa adını söyle', 'Kısa sohbet teneffüse kadar sürdü. İlk okul arkadaşını buldun.', { skillXP: { social: 8 }, happiness: 3, meet: 'friend' }),
      choice('Öğretmeninden yardım iste', 'Sınıfı birlikte dolaştınız. Nerede ne olduğunu öğrendin.', { knowledge: 3, grade: 3, stress: -3 })
    ], { once: true, weight: 5 }),
    event('forgotten_homework', 'Defter evde kaldı', 'Ödevini yaptın ama defterini masada unuttun. Öğretmenin kontrol etmeye başladı.', '📓', 7, 12, [
      choice('Durumu açıkla, yarın getir', 'Sözünü tuttun. Küçük bir not kaybıyla konuyu kapattın.', { grade: -2, skillXP: { social: 4 } }),
      choice('Arkadaşının defterini kullan', 'Öğretmenin yazının değiştiğini fark etti. Daha zor bir açıklama gerekti.', { grade: -6, stress: 4 }),
      choice('Konuyu tahtada çöz', 'Hazırlığınla konuyu kavradığını gösterdin.', { grade: 5, skillXP: { social: 4 } }, { requires: { stats: { knowledge: 30 } } })
    ]),
    event('school_bully', 'Teneffüste kırıcı sözler', 'Bir öğrenci arkadaşlarının önünde seninle alay ediyor. Diğerleri ne yapacağını bekliyor.', '🎒', 7, 16, [
      choice('Güvendiğin bir öğretmene anlat', 'Öğretmenin konuyu takip etti. Tek başına olmadığını hissettin.', { happiness: 3, stress: -4, skillXP: { social: 2 } }),
      choice('Sakin ve net sınır koy', 'Sesini yükseltmeden kendini savundun.', { skillXP: { social: 10 }, happiness: 4 }, { requires: { skills: { social: 1 } } }),
      choice('İtiren tarafa sen ol', 'Kavga büyüdü; yaralandın ve disiplin kaydı aldın.', { strength: 2, health: -8, grade: -6, stress: 6, flag: 'discipline' })
    ], { requires: { school: true } }),
    event('science_seed', 'Bir kutudan bilim projesi', 'Öğretmenin bilim şenliğine katılmanı önerdi. Basit bir düzenek bile iyi bir fikirle dikkat çekebilir.', '🔬', 9, 14, [
      choice('Geri dönüşüm malzemeleriyle başla', 'İlk taslağını yaptın. Gelecek yıl projeyi sergileme fırsatın olacak.', { knowledge: 5, grade: 3, flag: 'science_project' }, { schedule: { id: 'science_fair', after: 1 } }),
      choice('Hazır deney seti al', 'Düzeneğini kurdun. Şenlik için daha kapsamlı bir sunum hazırlayacaksın.', { knowledge: 7, grade: 4, flag: 'science_project' }, { cost: 1500, schedule: { id: 'science_fair', after: 1 } }),
      choice('Bu yıl derslerine odaklan', 'Şenliği arkadaşlarına bıraktın; mevcut derslerini toparladın.', { grade: 4, stress: -2 })
    ], { once: true, requires: { school: true } }),
    event('science_fair', 'Bilim şenliğinde son masa', 'Geçen yıl başladığın proje sonunda jüri karşısında. Düzeneğin çalışıyor; şimdi fikrini anlatma sırası.', '🏆', 0, 110, [
      choice('Deneyini adım adım açıkla', 'Çalışmanın emeğini anlattın.', {}, { chance: { stat: 'knowledge', target: 40, success: { effects: { grade: 10, happiness: 8, money: 2500, flag: 'science_award' }, text: 'Jüri projenin açıklığını beğendi. Başarı belgesi ve para ödülü aldın.' }, failure: { effects: { knowledge: 5, happiness: 2 }, text: 'Ödül alamadın ama sorulardan çok şey öğrendin. İlk projen sergilendi.' } } }),
      choice('Sunumu bir arkadaşınla yap', 'Görevleri paylaşınca heyecanın azaldı; yeni bir arkadaş kazandın.', { grade: 5, skillXP: { social: 6 }, meet: 'friend' })
    ], { triggeredOnly: true, once: true }),
    event('team_selection', 'Takım seçmeleri', 'Beden eğitimi öğretmenin seni okul takımının denemesine çağırdı. Seçmeler haftaya.', '⚽', 8, 16, [
      choice('Antrenman yapıp dene', 'Seçmede elinden geleni yaptın.', {}, { requires: { items: ['shoes'] }, chance: { stat: 'strength', target: 35, success: { effects: { strength: 5, happiness: 7, meet: 'friend', flag: 'school_team' }, text: 'Takıma seçildin; ilk antrenmanda yeni bir arkadaş edindin.' }, failure: { effects: { strength: 4, happiness: -2 }, text: 'Bu kez seçilmedin. Antrenman yine de kondisyonunu geliştirdi.' } } }),
      choice('Maç organizasyonuna yardım et', 'Takımın yanında başka bir rol buldun; öğretmenin sorumluluğunu fark etti.', { skillXP: { social: 6 }, grade: 2, happiness: 2 }),
      choice('İzleyici olarak destek ol', 'Arkadaşlarının maçını keyifle izledin.', { happiness: 3, stress: -2 })
    ], { requires: { school: true } }),
    event('class_trip', 'Sınıf gezisi', 'Sınıfın müze gezisine hazırlanıyor. Katılım ücreti var ama okulun ücretsiz kontenjanı da bulunuyor.', '🚌', 8, 15, [
      choice('Biletini al', 'Müzede gördüklerin merakını artırdı; dönüşte herkes aynı hikâyeyi anlatıyordu.', { knowledge: 5, happiness: 4, meet: 'friend' }, { cost: 700 }),
      choice('Ücretsiz kontenjana başvur', 'Öğretmenin seni kontenjana yazdı. Gezide yeni şeyler öğrendin.', { knowledge: 4, happiness: 2 }),
      choice('Kütüphanede kendi keşfini yap', 'Gezemediğin sergi hakkında bir kitap buldun.', { knowledge: 3, stress: -2 })
    ], { requires: { school: true } }),
    event('lost_wallet', 'Bankta unutulmuş cüzdan', 'İçinde kimlik ve bir miktar para bulunan bir cüzdan buldun. Sahibi yakınlarda görünmüyor.', '👛', 9, 80, [
      choice('Danışmaya teslim et', 'Cüzdan sahibine ulaştı. Doğru şeyi yapmanın huzurunu hissettin.', { happiness: 5, skillXP: { social: 4 } }),
      choice('Parayı al, cüzdanı bırak', 'Paran arttı ama kararın aklını kurcaladı.', { money: 1800, happiness: -4, stress: 5, flag: 'kept_wallet' })
    ]),
    event('school_friend_moves', 'Boş kalacak sıra', 'Yakın arkadaşın ailesiyle başka bir şehre taşınacağını söyledi. Sıradaki sessizlik şimdiden tuhaf geliyor.', '📮', 9, 17, [
      choice('İletişimde kalmak için sözleş', 'Ayrılık üzdü ama arkadaşlığı sürdürmeye karar verdiniz.', { bond: 5, happiness: -2, skillXP: { social: 4 } }),
      choice('Bir veda günü düzenle', 'Birlikte güzel bir anı bıraktınız.', { bond: 8, happiness: 3 }, { cost: 350 }),
      choice('Üzüntünü içine at', 'Vedalaşmak zor geldi. Duygularını paylaşmak için zamana ihtiyacın var.', { happiness: -4, stress: 4 })
    ], { npcRole: 'friend', requires: { npcRole: 'friend', school: true } }),
    event('exam_pressure', 'Sınav haftası', 'Üst üste sınavların var. Takvimi görünce hangi dersten başlayacağını şaşırdın.', '📝', 11, 27, [
      choice('Gerçekçi bir çalışma planı yap', 'Her güne bir konu ayırdın. Düzenli çalışma notlarına yansıdı.', { grade: 7, knowledge: 3, stress: 3 }),
      choice('Bir gece hiç uyumadan çalış', 'Bazı soruları yetiştirdin ama yorgunluk bedelini aldı.', { grade: 9, knowledge: 2, health: -6, stress: 8 }),
      choice('Bir dersten yardım iste', 'Anlamadığın yeri kabul etmek işini kolaylaştırdı.', { grade: 4, skillXP: { social: 4 }, stress: -2, meet: 'friend' })
    ], { requires: { school: true } }),
    event('group_project', 'Grup ödevinde yük paylaşımı', 'Grup ödevinin teslimi yaklaşırken herkes senden daha fazlasını bekliyor.', '🗂️', 12, 24, [
      choice('İşleri adil biçimde bölüştür', 'Beklentileri açıkça konuştunuz; herkes bir bölüm üstlendi.', { grade: 5, skillXP: { social: 8 }, stress: -2 }),
      choice('Hepsini kendin tamamla', 'Ödev iyi oldu; dinlenmeye ayıracak zamanın kalmadı.', { grade: 9, knowledge: 3, stress: 9, happiness: -3 }),
      choice('Yapabildiğin bölümü teslim et', 'Kendi payını tamamladın. Ortak not biraz düşük kaldı.', { grade: -2, stress: -3 })
    ], { requires: { school: true } }),
    event('social_media', 'Paylaş tuşunun önünde', 'Bir arkadaşının komik ama mahcup edici fotoğrafı grubunda dolaşıyor. Senden de paylaşmanı istediler.', '📱', 13, 23, [
      choice('Arkadaşının iznini sor', 'Fotoğrafın paylaşılmasını istemediğini öğrendin. Sana güvendi.', { skillXP: { social: 6 }, happiness: 3, bond: 4 }),
      choice('Gruptan sessizce çık', 'Tartışmaya girmeden sınırını korudun.', { stress: -3 }),
      choice('Beğeni toplamak için paylaş', 'Kısa süreli ilginin ardından arkadaşın kırıldı.', { skillXP: { social: 2 }, bond: -8, stress: 5, happiness: -3 })
    ], { requires: { items: ['phone'] }, npcRole: 'friend' }),
    event('audition_seed', 'Gençlik sahnesi', 'Mahalle kültür merkezi genç müzisyenleri arıyor. Sahneye çıkma fikri hem heyecanlandırıyor hem korkutuyor.', '🎸', 13, 22, [
      choice('Seçmelere hazırlan', 'Bir repertuvar hazırlamaya başladın. Gelecek yıl çağrılacaksın.', { skillXP: { social: 6 }, stress: 3, flag: 'audition_ready' }, { requires: { items: ['guitar'] }, schedule: { id: 'audition_final', after: 1 } }),
      choice('Sahne arkasına gönüllü ol', 'Organizasyonun parçası oldun; kuliste yeni insanlarla tanıştın.', { skillXP: { social: 8 }, happiness: 3, meet: 'friend' }),
      choice('Konseri izlemeye git', 'Başkasının sahnesi sana ilham verdi.', { happiness: 4, stress: -2 })
    ], { once: true }),
    event('audition_final', 'Işıklar açılıyor', 'Hazırlandığın seçmede adın okundu. Geçen yılki çalışmalarını şimdi paylaşabilirsin.', '🎤', 0, 110, [
      choice('Kendi yorumunla çal', 'Gitarını eline alıp sahneye çıktın.', {}, { requires: { items: ['guitar'] }, chance: { skill: 'creative', target: 42, success: { effects: { skillXP: { creative: 14 }, happiness: 9, money: 3500, taxable: true, flag: 'local_performer', meet: 'friend' }, text: 'Dinleyiciler sana eşlik etti. Küçük bir ücretli sahne teklifi aldın.' }, failure: { effects: { skillXP: { creative: 8 }, happiness: -2 }, text: 'Heyecandan birkaç nota kaçtı. Yine de ilk sahneni tamamladın.' } } }),
      choice('Bu kez organizasyona yardım et', 'Sahne yerine ekibe katıldın; deneyimin başka türlü büyüdü.', { skillXP: { social: 6 }, happiness: 2, meet: 'friend' })
    ], { triggeredOnly: true, once: true }),
    event('first_crush', 'Konuşmak için bir bahane', 'Etkinlikte hoşuna giden biri var. İkiniz de aynı kitabın standında duruyorsunuz.', '💌', 16, 29, [
      choice('Kitap hakkında sohbet aç', 'Ortak bir konudan konuşmak kolay geldi. Yeni biriyle tanıştın.', { skillXP: { social: 6 }, happiness: 4, meet: 'friend' }),
      choice('Duygularını hemen anlat', 'Dürüstçe bir adım attın.', {}, { chance: { skill: 'social', target: 36, success: { effects: { happiness: 7, skillXP: { social: 6 }, meet: 'friend' }, text: 'Gülümseyip sohbeti sürdürdü. Birlikte vakit geçirmek için sözleştiniz.' }, failure: { effects: { happiness: -3, skillXP: { social: 4 } }, text: 'Aynı ilgiyi paylaşmıyordu. Saygıyla kabul ettin ve deneyim kazandın.' } } }),
      choice('Kendi hızında kal', 'Aceleden uzak, etkinliğin keyfini çıkardın.', { happiness: 2, stress: -2 })
    ]),
    event('teen_party', 'Bir ev partisi', 'Arkadaşların hafta sonu bir parti düzenliyor. Ertesi gün tamamlaman gereken işler de var.', '🎉', 15, 24, [
      choice('Kısa süre uğra', 'Sohbet ettin, zamanında döndün. Yeni biriyle tanıştın.', { happiness: 5, skillXP: { social: 6 }, meet: 'friend' }, { cost: 300 }),
      choice('Geceyi uzat', 'Eğlendin ama ertesi günü yorgun geçirdin.', { happiness: 8, skillXP: { social: 8 }, health: -4, grade: -3, stress: 3 }, { cost: 800 }),
      choice('Evde sakin bir akşam geçir', 'Dinlendin; aklındaki işleri tamamladın.', { health: 3, grade: 2, stress: -4 })
    ]),
    event('career_day', 'Meslek günündeki stant', 'Okulun meslek gününde farklı alanlardan insanlar var. Her standın anlattığı hayat başka.', '🧭', 15, 18, [
      choice('Teknik atölyeyi dene', 'Bir devreyi çalıştırınca teorinin işe yaradığını gördün.', { knowledge: 5, flag: 'technical_interest' }),
      choice('Bir konuşmacıya soru sor', 'Mesleğin zor yanlarını da dinledin. Beklentilerin netleşti.', { skillXP: { social: 6 }, knowledge: 3 }),
      choice('Karar vermek için zaman iste', 'Tek günde bütün hayatını seçmen gerekmiyordu.', { stress: -5, happiness: 2 })
    ], { once: true, requires: { school: true } }),
    event('scholarship_seed', 'Burs başvuru dosyası', 'Bir vakıf, öğrencilerden notlarının yanında kendi hikâyelerini anlatan bir mektup istiyor.', '✉️', 16, 20, [
      choice('Başvuruyu özenle hazırla', 'Mektubunu ve notlarını gönderdin. Yanıt gelecek yıl gelecek.', { knowledge: 3, flag: 'scholarship_application' }, { schedule: { id: 'scholarship_result', after: 1 } }),
      choice('Bu yıl işe ve birikime odaklan', 'Küçük bir dönemlik işten eğitim için para ayırdın.', { money: 2500, taxable: true, stress: 3 })
    ], { once: true }),
    event('scholarship_result', 'Burs komisyonundan mektup', 'Geçen yıl yaptığın başvurunun değerlendirmesi tamamlandı. Zarfı açıyorsun.', '🎓', 0, 110, [
      choice('Sonucu öğren', 'Başvurun değerlendirildi.', {}, { chance: { stat: 'knowledge', target: 48, success: { effects: { money: 18000, happiness: 8, flag: 'scholar' }, text: 'Eğitim fonundan tek seferlik destek kazandın. Bu para eğitim masraflarını hafifletecek.' }, failure: { effects: { happiness: -3, knowledge: 2 }, text: 'Kontenjan sınırlıydı; bu kez destek çıkmadı. Başvuru deneyimi kazandın.' } } }),
      choice('Planını destek olmadan sürdür', 'Sonucun planını durdurmasına izin vermedin.', { stress: -3, knowledge: 2 })
    ], { triggeredOnly: true, once: true }),
    event('driving_offer', 'Direksiyonun başına geçmek', 'Sürücü kursu yeni dönem kayıtlarını açtı. Otomobil sahibi olmadan önce ehliyet gerekiyor.', '🚦', 18, 45, [
      choice('Kursa kaydol ve sınava gir', 'Dersleri ve sınavı tamamlayıp ehliyetini aldın.', { knowledge: 2, flag: 'driver_license' }, { cost: 16000 }),
      choice('Toplu taşımayla devam et', 'Bu masrafı bütçenden uzak tuttun.', { stress: -2 })
    ], { once: true, requires: { notFlags: ['driver_license'] } }),
    event('university_orientation', 'Kampüste ilk hafta', 'Kayıt işlemleri bitti. Kulüpler tanıtım yapıyor, üst sınıflar tavsiye dağıtıyor.', '🎓', 18, 30, [
      choice('Akademik kulübe katıl', 'Çalışabileceğin bir çevre ve yeni arkadaşlar buldun.', { grade: 4, knowledge: 4, meet: 'friend' }),
      choice('Kampüsü bir grupla keşfet', 'Kaybolarak da olsa yerleri öğrendiniz. Bir arkadaşlık başladı.', { skillXP: { social: 8 }, happiness: 4, meet: 'friend' }),
      choice('Ders programını sakin sakin kur', 'Önceliklerini netleştirdin, ilk haftanın telaşı azaldı.', { grade: 3, stress: -5 })
    ], { once: true, requires: { school: true } }),
    event('first_budget', 'Ay sonu hesabı', 'Yetişkin hayatın giderleri düşündüğünden fazla. Defterde küçük harcamalar uzun bir liste olmuş.', '🧾', 18, 26, [
      choice('Harcamalarını tek tek gözden geçir', 'Bazı gereksiz masrafları kestin. Küçük bir tasarruf yaptın.', { money: 1800, knowledge: 3, stress: -3 }),
      choice('Ek iş kabul et', 'Birkaç hafta sonunu çalışarak geçirip açığı kapattın.', { money: 5000, taxable: true, stress: 7, health: -2 }),
      choice('Hesaba bakmayı ertele', 'Rakamlar değişmedi, belirsizlik biraz daha yorucu oldu.', { stress: 5, happiness: -2 })
    ], { once: true }),
    event('roommate_conflict', 'Ortak alanda anlaşmazlık', 'Birlikte kaldığın kişi temizlik ve masraf paylaşımına uymuyor. Birikmiş bir gerginlik var.', '🏠', 18, 35, [
      choice('Yazılı bir paylaşım planı öner', 'Beklentiler açık hâle gelince konuşmak kolaylaştı.', { skillXP: { social: 8 }, stress: -6 }),
      choice('Masrafı bu kez sen karşıla', 'Ev toparlandı ama bütçenden bir pay daha gitti.', { happiness: 3, stress: -3 }, { cost: 1800 }),
      choice('Tartışmayı büyüt', 'Haklı olduğun noktalar yüksek sesin arasında kayboldu.', { stress: 8, happiness: -4 })
    ]),
    event('unpaid_internship', 'Ücretsiz staj teklifi', 'Bir kuruluş deneyim vaat ediyor ama ücret ödemiyor. Yol ve yemek masrafı da sana kalacak.', '🪪', 18, 27, [
      choice('Kısa süreli deneyim için kabul et', 'Yeni beceriler öğrendin ve mesleki bir tanışıklık kurdun.', { knowledge: 6, skillXP: { social: 4 }, stress: 4, meet: 'colleague', flag: 'internship' }, { cost: 2200 }),
      choice('Ücretli görev olup olmadığını sor', 'Sınırlarını açıkça anlattın.', {}, { chance: { skill: 'social', target: 42, success: { effects: { money: 4500, taxable: true, knowledge: 4, flag: 'internship' }, text: 'Kısa süreli ücretli bir görev buldular. Deneyim ve emek geliri kazandın.' }, failure: { effects: { skillXP: { social: 4 } }, text: 'Bütçeleri yoktu. Görüşmeyi iyi bir iletişimle kapattın.' } } }),
      choice('Başka fırsat ara', 'Bütçene uymayan teklifi kibarca geri çevirdin.', { stress: -3, happiness: 1 })
    ], { requires: { job: false } }),
    event('mentor_seed', 'Deneyimli birinin öğle arası', 'İşyerinde deneyimli bir çalışan, gelişmek istediğin konuları konuşmak için zaman ayırabileceğini söyledi.', '☕', 18, 50, [
      choice('Düzenli görüşme öner', 'Bir gelişim planı yaptınız. Sonuçlarını gelecek yıl göreceksin.', { knowledge: 3, performance: 4, flag: 'mentored' }, { schedule: { id: 'mentor_project', after: 1 } }),
      choice('Somut bir soruyla başla', 'Küçük bir tavsiye işini hemen kolaylaştırdı.', { knowledge: 3, performance: 3, meet: 'colleague' }),
      choice('Şimdilik kendi tempona devam et', 'Mevcut görevlerini sakin biçimde tamamladın.', { stress: -3 })
    ], { once: true, requires: { job: true } }),
    event('mentor_project', 'İlk bağımsız sorumluluk', 'Geçen yıl aldığın tavsiyeleri kullanabileceğin bir proje önüne geldi. Kendi kararlarını savunman bekleniyor.', '🗂️', 0, 110, [
      choice('Projeyi üstlen', 'Hazırlıklarını uygulamaya döktün.', {}, { requires: { job: true }, chance: { stat: 'knowledge', target: 50, success: { effects: { performance: 18, money: 10000, taxable: true, skillXP: { social: 6 } }, text: 'Proje iyi sonuçlandı. Performansın fark edildi ve başarı primi aldın.' }, failure: { effects: { performance: 3, knowledge: 5, stress: 6 }, text: 'Takvim sarktı ama hatalarını belgeledin. Önemli bir deneyim kazandın.' } } }),
      choice('Öğrendiklerini kişisel gelişimine aktar', 'İş koşulları değişse bile kazandığın beceriler sende kaldı.', { knowledge: 5, stress: -2 })
    ], { triggeredOnly: true, once: true }),
    event('work_credit', 'Fikrinin altında başka bir isim', 'Toplantıda önerdiğin fikir, raporda bir başkasına yazılmış. Yöneticin henüz durumu bilmiyor.', '📋', 18, 65, [
      choice('Belgelerinle sakin bir görüşme yap', 'Katkını açıkça gösterdin. Yöneticin düzeltme yaptı.', { performance: 6, skillXP: { social: 6 }, stress: -2 }),
      choice('Herkesin önünde suçla', 'Konu görünür oldu ama ekip içindeki gerginlik arttı.', { skillXP: { social: 2 }, performance: -4, stress: 7 }),
      choice('Bu kez geçmesine izin ver', 'Tartışma çıkmadı; yaşanan haksızlık aklında kaldı.', { happiness: -4, stress: 4 })
    ], { requires: { job: true } }),
    event('overtime_request', 'Acil teslim, uzun akşam', 'Yöneticin son anda yetişmesi gereken bir işi akşam da sürdürmeni istiyor.', '🌃', 18, 65, [
      choice('Bu kez destek ol', 'İş zamanında bitti. Performansın arttı, dinlenmen aksadı.', { performance: 9, stress: 7, health: -3 }),
      choice('Süre ve iş kapsamını konuş', 'İşi daha gerçekçi bir takvime yerleştirdiniz.', { performance: 4, skillXP: { social: 6 } }, { requires: { skills: { social: 1 } } }),
      choice('Bugün dinlenmen gerektiğini söyle', 'Sınırını korudun. İşyerinin beklentisiyle küçük bir gerilim yaşandı.', { health: 3, stress: -5, performance: -2 })
    ], { requires: { job: true } }),
    event('work_error', 'Yanlış giden bir işlem', 'Gönderdiğin dosyada bir hata buldun. Henüz kimse fark etmedi ama ileride sorun çıkarabilir.', '📎', 18, 65, [
      choice('Hemen bildir ve düzelt', 'Hata büyümeden çözüldü. Sorumluluk alman takdir edildi.', { performance: 4, knowledge: 3, stress: -2 }),
      choice('Kimseye söylemeden düzeltmeye çalış', 'Sorunu tek başına çözmek yorucuydu.', {}, { chance: { stat: 'knowledge', target: 45, success: { effects: { performance: 3, stress: 3 }, text: 'Hatayı düzelttin; yine de sonraki işler için kontrol listesi hazırladın.' }, failure: { effects: { performance: -10, stress: 8 }, text: 'Düzeltme başka bir sorunu büyüttü. Ekip geç haberdar olduğu için zorlandı.' } } }),
      choice('Fark edilmemesini um', 'Hata başka bir çalışanın işini etkileyince ortaya çıktı.', { performance: -12, stress: 6, happiness: -3 })
    ], { requires: { job: true } }),
    event('company_cutbacks', 'İşyerinde kemer sıkma', 'Şirket maliyetleri azaltıyor. Ekipte herkes gelecek yılın nasıl olacağını konuşuyor.', '🏢', 20, 64, [
      choice('Becerilerini görünür kıl', 'Tamamladığın işleri belgeledin ve yeni sorumluluklar aldın.', { performance: 7, knowledge: 2, stress: 5 }),
      choice('Dışarıdaki mesleki çevreni genişlet', 'Belirsizliğe karşı yeni bağlantılar kurdun.', { skillXP: { social: 8 }, meet: 'colleague', stress: -2 }),
      choice('Mevcut görevlerine odaklan', 'Dedikodudan uzak durup işini sürdürdün.', { performance: 2, stress: 1 })
    ], { requires: { job: true } }),
    event('salary_negotiation', 'Ücret değerlendirmesi', 'Yöneticin bu yılki katkını konuşmak için görüşme açtı. Başarılarını anlatma fırsatın var.', '💼', 20, 64, [
      choice('Sonuçlarını somut örneklerle anlat', 'Katkını görünür kıldın.', {}, { chance: { skill: 'social', target: 45, success: { effects: { money: 12000, taxable: true, performance: 8, happiness: 4 }, text: 'Talebin tek seferlik başarı primiyle karşılandı.' }, failure: { effects: { performance: 3, skillXP: { social: 4 } }, text: 'Bu yıl ek bütçe çıkmadı; beklentilerini açıkça ifade ettin.' } } }),
      choice('Eğitim desteği iste', 'Yeni beceriler kazanmak için çalışma içinde zaman ayrıldı.', { knowledge: 6, performance: 4 }),
      choice('Geri bildirimi dinle', 'Hangi alanlarda gelişebileceğini öğrendin.', { knowledge: 3, stress: -2 })
    ], { requires: { job: true } }),
    event('friend_needs_help', 'Arkadaşından gece mesajı', 'Bir arkadaşın zor bir dönem geçiriyor. Sadece konuşacak birini aradığını söyledi.', '💬', 14, 90, [
      choice('Dinlemek için zaman ayır', 'Her şeyi çözmedin ama yanında oldun. Bağınız güçlendi.', { bond: 8, happiness: 3, stress: 2 }),
      choice('Yarın için sakin bir buluşma öner', 'Kendi sınırlarını koruyarak destek oldun.', { bond: 5, happiness: 2 }),
      choice('Mesajı yanıtsız bırak', 'Uzaklaşman arkadaşını üzdü.', { bond: -6, stress: 2 })
    ], { npcRole: 'friend', requires: { npcRole: 'friend' } }),
    event('friend_business_seed', 'Yakın birinin iş fikri', 'Arkadaşın küçük bir iş kurmak istiyor ve senden borç istiyor. İstenen tutar seçenekte görünüyor; geri dönüşü garanti değil.', '💡', 20, 55, [
      choice('Riskini bilerek borç ver', 'Parayı ve geri ödeme beklentini açıkça konuştun. Gelecek yıl haber bekleyeceksin.', { bond: 5, flag: 'friend_loan' }, { cost: 8000, schedule: { id: 'friend_business_result', after: 1 } }),
      choice('Parayla değil planla yardım et', 'Maliyetlerini birlikte gözden geçirdiniz.', { bond: 4, knowledge: 3 }),
      choice('Bütçene uymadığını söyle', 'Sınırını dürüstçe anlattın. Konu biraz mahcup etti.', { bond: -1, stress: -2 })
    ], { once: true, npcRole: 'friend', requires: { npcRole: 'friend' } }),
    event('friend_business_result', 'Ödünç verdiğin paranın dönüşü', 'Geçen yıl destek olduğun işin ilk hesapları kapandı. Arkadaşın seninle konuşmak istiyor.', '🧾', 0, 110, [
      choice('Hesapları birlikte gözden geçir', 'İşin sonucunu dinledin.', {}, { chance: { stat: 'knowledge', target: 50, success: { effects: { money: 10000, bond: 4, happiness: 4, clearFlag: 'friend_loan' }, text: 'İş tutundu. Arkadaşın borcunu küçük bir teşekkür payıyla birlikte ödedi.' }, failure: { effects: { money: 3000, bond: -3, happiness: -3, clearFlag: 'friend_loan' }, text: 'İş bekleneni vermedi. Paranın yalnızca bir bölümünü geri alabildin; kalan kısmını kaybettin.' } } }),
      choice('Geri ödemeden vazgeç', 'Parayı destek olarak bıraktın. Cömertliğin bütçene mal oldu.', { bond: 9, happiness: 2, clearFlag: 'friend_loan' })
    ], { triggeredOnly: true, once: true, npcRole: 'friend' }),
    event('partner_plans', 'Aynı hafta sonu, iki plan', 'Partnerin birlikte zaman bekliyor; sen ise kendi planına söz verdin. İkiniz de anlaşılmak istiyorsunuz.', '💞', 18, 90, [
      choice('Birlikte yeni bir plan kur', 'Her ikinizin isteğine yer açan bir yol buldunuz.', { bond: 7, skillXP: { social: 4 }, happiness: 4 }),
      choice('Kendi planını açıkça anlat', 'Partnerin biraz üzüldü ama dürüst konuşmanız güveni korudu.', { bond: 1, stress: -3 }),
      choice('Son ana kadar haber verme', 'Belirsizlik tartışmaya dönüştü.', { bond: -8, happiness: -4, stress: 5 })
    ], { npcRole: 'partner', requires: { npcRole: 'partner' } }),
    event('anniversary', 'Takvimde küçük bir yıldız', 'Partnerinle ilişkinizin yıl dönümü yaklaşıyor. Anlamlı bir gün için çok para gerekmeyebilir.', '🌷', 18, 95, [
      choice('Birlikte anılarınızı anlatan mektup yaz', 'Özenli sözlerin partnerini mutlu etti.', { bond: 6, happiness: 4 }),
      choice('Özel bir akşam yemeği planla', 'Gündelik telaştan uzak bir akşam geçirdiniz.', { bond: 9, happiness: 6 }, { cost: 2500 }),
      choice('Bu yıl kutlamayı atla', 'Yoğunluğu gerekçe gösterdin; partnerin beklediği ilgiyi göremedi.', { bond: -5, happiness: -2 })
    ], { npcRole: 'partner', requires: { npcRole: 'partner' } }),
    event('child_question', 'Zor bir soru, küçük bir ses', 'Çocuğun herkesin neden aynı imkânlara sahip olmadığını soruyor. Basit bir cevap bulmak zor.', '🧒', 20, 90, [
      choice('Yaşına uygun ve dürüstçe anlat', 'Birlikte düşünüp küçük bir dayanışma fikri buldunuz.', { bond: 6, knowledge: 2, happiness: 3 }),
      choice('Bir kitap üzerinden konuş', 'Hikâyedeki karakterler konuşmayı kolaylaştırdı.', { bond: 7, happiness: 3, knowledge: 3 }, { requires: { items: ['book'] } }),
      choice('Sonra konuşmayı öner', 'Şimdilik erteledin; merakı devam ediyor.', { bond: -1 })
    ], { npcRole: 'child', requires: { npcRole: 'child' } }),
    event('child_school_issue', 'Okuldan gelen telefon', 'Çocuğunun öğretmeni son günlerde derste içine kapandığını söyledi.', '☎️', 25, 80, [
      choice('Önce çocuğunu dinle', 'Yaşadığı küçük bir sorunu anlatabildi. Birlikte çözüm aradınız.', { bond: 8, happiness: 3, stress: 2 }),
      choice('Öğretmeniyle ortak plan yap', 'Ev ve okul aynı yönde destek vermeye başladı.', { bond: 5, knowledge: 3 }),
      choice('Kendiliğinden geçmesini bekle', 'Konu ertelendi; çocuğun biraz daha yalnız hissetti.', { bond: -5, stress: 4 })
    ], { npcRole: 'child', requires: { npcRole: 'child' } }),
    event('parents_repair', 'Ailenin evinde bir arıza', 'Ailenin evindeki eski tesisat masraf çıkardı. Onarım için destek istiyorlar.', '🔧', 18, 65, [
      choice('Onarım ücretine katkı yap', 'Ailen rahat bir nefes aldı; desteğini unutmadı.', { bond: 8, happiness: 3 }, { cost: 4500 }),
      choice('Takımınla küçük onarımları yap', 'Güvenle yapabildiğin işleri tamamladın; ustanın işi azaldı.', { bond: 6, knowledge: 3 }, { requires: { items: ['toolkit'], stats: { knowledge: 35 } } }),
      choice('Uygun bir usta bulmalarına yardım et', 'Para veremesen de çözüm aramak işe yaradı.', { bond: 3, skillXP: { social: 4 } })
    ], { npcRole: 'parent' }),
    event('parents_distance', 'Uzun zamandır konuşmadınız', 'Ailenden biri telefonda sesini özlediğini söyledi. Günlük telaş görüşmeleri azaltmış.', '📞', 18, 75, [
      choice('Düzenli konuşmak için zaman ayır', 'Küçük bir rutin, aranızdaki mesafeyi azalttı.', { bond: 7, happiness: 3, stress: -2 }),
      choice('Sürpriz ziyaret yap', 'Birlikte sofraya oturmak ikinize de iyi geldi.', { bond: 10, happiness: 5 }, { cost: 1200 }),
      choice('Yoğun olduğunu söyle', 'Anlayışla karşıladılar ama görüşme yine ertelendi.', { bond: -3, stress: 1 })
    ], { npcRole: 'parent' }),
    event('unexpected_bill', 'Hesaba katılmayan fatura', 'Bir tamir ve birikmiş küçük giderler aynı haftaya denk geldi. Hesapta olmayan bir masraf çıktı.', '🧾', 18, 90, [
      choice('Faturayı hemen öde', 'Beklenmedik gideri kapattın; en azından belirsizlik bitti.', { stress: -2 }, { cost: 3000 }),
      choice('Taksit ve indirim için görüş', 'Gideri azaltmak için uğraştın.', {}, { chance: { skill: 'social', target: 38, success: { effects: { money: -1800, stress: 2 }, text: 'İndirim aldın ve daha az ödeme yaptın. Bakiyen yetmezse fark borca yansır.' }, failure: { effects: { money: -3300, stress: 5 }, text: 'Gecikme gideri yüzünden fatura büyüdü. Bakiyen yetmezse fark borca yansır.' } } }),
      choice('Ödemeyi sonraya bırak', 'Fatura gecikme bedeliyle bütçene işlendi; yetmeyen kısım borca dönüştü.', { money: -3600, stress: 6 })
    ]),
    event('too_good_offer', 'Garantili kazanç vaadi', 'Bir tanıdık, hiç risk taşımadığını söylediği bir yatırıma para koymanı istiyor. Belgeler belirsiz.', '⚠️', 18, 80, [
      choice('Belgeleri inceleyip vazgeç', 'Şeffaf olmayan tekliften uzak durdun.', { knowledge: 3, stress: -2 }),
      choice('Kaybetmeyi göze alarak katıl', 'Söz verilen ödeme gelmedi. Paranı geri alamadın.', { happiness: -7, stress: 9, flag: 'scam_lesson' }, { cost: 6000 }),
      choice('Güvendiğin birine danış', 'İkinci bir bakış, kaçırdığın işaretleri görmeni sağladı.', { knowledge: 2, skillXP: { social: 4 } })
    ], { once: true }),
    event('secondhand_deal', 'İkinci el bilgisayar', 'Bir tanıdığın çalışır durumdaki bilgisayarını piyasanın altında satıyor. Pilinin ömrü kısa ama iş görüyor.', '💻', 14, 60, [
      choice('İstenen ücreti ödeyip satın al', 'Bilgisayarın yeni öğrenme ve çalışma seçenekleri açtı.', { items: ['laptop'], knowledge: 2 }, { cost: 12000 }),
      choice('İhtiyacın için birikmeye devam et', 'Bütçeni zorlamadın; başka bir fırsatı bekleyeceksin.', { stress: -2 })
    ], { once: true }),
    event('debt_pressure', 'Borçların masadaki ağırlığı', 'Ödeme takvimi zihnini meşgul ediyor. Bugün küçük de olsa bir adım atabilirsin.', '📉', 18, 95, [
      choice('Bütçe danışmanlığından destek al', 'Borç takvimini görünür hâle getirdin. Belirsizlik azaldı.', { knowledge: 4, stress: -7 }),
      choice('Kısa süreli ek gelir yarat', 'Yorucu birkaç hafta bütçene bir miktar emek geliri ekledi.', { money: 4000, taxable: true, stress: 5, health: -2 }),
      choice('Hesapları kapatıp düşünmemeye çalış', 'Rakamlar aynı kaldı; kaçınmak rahatlatmadı.', { stress: 6, happiness: -3 })
    ], { requires: { debtAbove: 10000 } }),
    event('neighbour_exchange', 'Mahallede takas günü', 'Komşular kullanmadıkları eşyaları getiriyor. Para harcamadan yeni bir şey öğrenme fırsatı var.', '♻️', 8, 95, [
      choice('Kitap değişimine katıl', 'Bir kitaplık köşesi kuracak kadar kitapla döndün.', { items: ['book'], knowledge: 2, happiness: 2 }),
      choice('Organizasyona yardım et', 'Komşularını daha yakından tanıdın.', { skillXP: { social: 6 }, happiness: 4, meet: 'friend' }),
      choice('Sadece gezinip sohbet et', 'Kısa ve keyifli bir gün geçirdin.', { happiness: 3, stress: -3 })
    ]),
    event('car_repair', 'Gösterge panelindeki uyarı', 'Otomobilinin motor ışığı yandı. Kullanmayı sürdürmeden bir kontrol gerekiyor.', '🚗', 18, 95, [
      choice('Serviste kontrol ettir', 'Sorun büyümeden onarıldı.', { stress: -3 }, { cost: 6500 }),
      choice('Ulaşımı toplu taşımayla sürdür', 'Tamiri erteledin; bu yıl aracı zorlamamaya karar verdin.', { stress: 3, happiness: -2 }),
      choice('Sorunu görmezden gel', 'Küçük arıza büyüyünce masraf arttı; yetmeyen tutar borca yansıdı.', { money: -11000, stress: 6 })
    ], { requires: { items: ['car'] } }),
    event('seasonal_flu', 'Dinlenmeni isteyen bedenin', 'Boğazın ağrıyor, enerjin düşük. Günün planlarıyla dinlenme ihtiyacı çakıştı.', '🤒', 4, 95, [
      choice('Evde dinlen ve kendini izle', 'Programını hafiflettin. Birkaç zor günün ardından toparlandın.', { health: -2, stress: -3, happiness: -1 }),
      choice('Muayene ol', 'Doktorun önerileriyle süreci yönettin.', { health: 2, stress: -2 }, { cost: 1000 }),
      choice('Aynı tempoda devam et', 'Belirtiler uzadı. Tedavi ve dinlenme ihtiyacın arttı.', { health: -7, stress: 4, condition: 'flu' })
    ]),
    event('exercise_injury', 'Antrenmanda bir burkulma', 'Hareket ederken bileğin zorlandı. Ciddi görünmüyor ama üstüne basmak rahatsız ediyor.', '🩹', 10, 85, [
      choice('Aktiviteyi bırakıp sağlık merkezine git', 'Erken değerlendirme ve dinlenme sayesinde hasarı sınırladın.', { health: -2, stress: -1 }),
      choice('Bakım paketini kullanıp dinlen', 'Temel bakımla kendini rahatlattın, zorlamayı bıraktın.', { health: -1, stress: -2 }, { requires: { items: ['medicine'] }, effects: { health: -1, stress: -2, consume: ['medicine'] } }),
      choice('Acıya rağmen devam et', 'Zorlama sakatlığı uzattı; tedaviye ihtiyaç duyuyorsun.', { health: -10, condition: 'injury', stress: 4 })
    ], { requires: { stats: { strength: 30 } } }),
    event('stress_warning', 'Zihnin hiç susmuyor', 'Dinlensen de ertesi günün işleri aklından çıkmıyor. Yakınların daha gergin olduğunu fark etmiş.', '🌧️', 16, 90, [
      choice('Programını hafiflet ve destek iste', 'Her şeyi aynı anda yapamayacağını kabul ettin.', { stress: -12, health: 3, performance: -2 }),
      choice('Uzman desteğine başvur', 'Düşüncelerini konuşup uygulanabilir bir rutin oluşturdun.', { stress: -20, happiness: 5, health: 4 }, { cost: 1800 }),
      choice('Daha çok çalışarak bastır', 'Meşguliyet kısa süreli oyaladı; bedenin yorulmaya devam etti.', { performance: 4, health: -6, stress: 8 })
    ], { requires: { stressAbove: 55 } }),
    event('health_followup_seed', 'Kontrolde sınırda bir değer', 'Rutin muayenede doktorun bir değeri takip etmek istiyor. Kesin bir tanı yok; düzenli kontrol öneriyor.', '🩺', 35, 80, [
      choice('Takip planını kabul et', 'Küçük alışkanlık değişiklikleri yaptın. Gelecek yıl yeniden değerlendirileceksin.', { health: 3, stress: 2, flag: 'health_followup' }, { schedule: { id: 'health_followup_result', after: 1 } }),
      choice('Şimdilik ertele', 'Takip randevusu almadın; belirsizlik sürdü.', { health: -3, stress: 3 })
    ], { once: true }),
    event('health_followup_result', 'Kontrol randevusuna dönüş', 'Geçen yıl önerilen takip zamanı geldi. Sonucu mevcut sağlık durumun etkiliyor.', '❤️', 0, 110, [
      choice('Kontrolünü yaptır', 'Sağlık durumun yeniden değerlendirildi.', {}, { chance: { stat: 'health', target: 55, success: { effects: { health: 5, stress: -8, clearFlag: 'health_followup' }, text: 'Değerler daha iyi. Doktorun mevcut düzenini sürdürmeni önerdi.' }, failure: { effects: { health: -3, condition: 'hypertension', stress: 3, clearFlag: 'health_followup' }, text: 'Takip gerektiren tansiyon sorunu saptandı. Sağlık bölümünden düzenli tedavi alabilirsin.' } } }),
      choice('Randevuyu yine ertele', 'Takibi erteledin; sağlık riskinin yönetilmesi zorlaştı.', { health: -7, stress: 5, clearFlag: 'health_followup' })
    ], { triggeredOnly: true, once: true }),
    event('sleep_routine', 'Uykusuz sabahlar', 'Son zamanlarda geç yatıp erken kalkıyorsun. Gün içinde dikkatinin dağıldığını fark ettin.', '🌙', 14, 85, [
      choice('Uyku saatini düzenle', 'Akşam planlarını sadeleştirdin. Sabahların kolaylaştı.', { health: 5, stress: -8, happiness: 2 }),
      choice('Bir süre daha dayan', 'Yorgunluk birikmeye devam etti.', { health: -4, knowledge: -2, stress: 5 }),
      choice('Dinlenme ihtiyacını yakınlarınla konuş', 'Beklentileri paylaşmak üzerindeki baskıyı azalttı.', { skillXP: { social: 4 }, stress: -6, bond: 3 })
    ]),
    event('low_health_support', 'Merdivenler daha zor geliyor', 'Günlük işlerde eskisinden çabuk yoruluyorsun. Sağlığın artık planlarında öncelik istiyor.', '🏥', 18, 100, [
      choice('Ücretsiz sağlık merkezine başvur', 'Kontrol ve dinlenme önerileriyle ilk adımı attın.', { health: 7, stress: -4 }),
      choice('Kapsamlı muayene yaptır', 'Daha ayrıntılı değerlendirme ve takip planı aldın.', { health: 12, stress: -6, cure: true }, { cost: 3500 }),
      choice('İşleri azaltıp dinlen', 'Temponu düşürmek biraz nefes aldırdı.', { health: 4, stress: -5, performance: -2 })
    ], { requires: { healthBelow: 40 }, weight: 5 }),
    event('midlife_choice', 'Yıllar nereye gidiyor?', 'Eski bir fotoğrafa bakarken kurduğun hayatı düşünüyorsun. Bazı hayaller değişmiş, bazıları hâlâ orada.', '🪞', 38, 55, [
      choice('Küçük bir hayali yeniden başlat', 'Hayatına yeni bir öğrenme alanı açtın.', { knowledge: 4, happiness: 7, stress: -4 }),
      choice('Sevdiğin biriyle açıkça konuş', 'Düşüncelerini paylaşmak yükünü hafifletti.', { bond: 5, happiness: 5, stress: -5 }),
      choice('Büyük ve pahalı bir değişiklik yap', 'Yeni deneyim heyecan verdi; bütçende ciddi bir iz bıraktı.', { happiness: 12, skillXP: { social: 4 }, stress: -5 }, { cost: 25000 })
    ], { once: true }),
    event('old_friend', 'Yıllar sonra aynı ses', 'Uzun zamandır görmediğin bir tanıdık seni aradı. İkiniz de başka hayatlar yaşamışsınız.', '📻', 35, 90, [
      choice('Bir yürüyüş için buluş', 'Eski hikâyeler yeni bir dostluğa dönüştü.', { happiness: 6, skillXP: { social: 6 }, meet: 'friend' }),
      choice('Telefonda uzun uzun konuş', 'Geçmişi hatırlamak iyi geldi.', { happiness: 4, stress: -4 }),
      choice('Bu dönem uygun olmadığını söyle', 'Kibarca başka zamana bıraktın.', { stress: -1 })
    ]),
    event('community_garden', 'Mahalle bostanında bir sıra', 'Mahalle bostanında gönüllüler yeni bir bölüm açıyor. Deneyim gerekmiyor, emek gerekiyor.', '🌱', 30, 95, [
      choice('Haftalık bakıma katıl', 'Toprakla uğraşmak iyi geldi; mahalleden biriyle dost oldun.', { health: 3, happiness: 5, stress: -6, meet: 'friend' }),
      choice('Kendi setinle fide yetiştir', 'Fidelerin bostana taşındı. Bir şeyin büyümesini görmek sevindirdi.', { happiness: 7, knowledge: 4, skillXP: { social: 4 } }, { requires: { items: ['garden_kit'] } }),
      choice('Hasat gününe uğra', 'Emek verenlerle sohbet ederek sakin bir gün geçirdin.', { happiness: 3, stress: -3 })
    ]),
    event('retirement_plans', 'Çalışmanın ötesindeki günler', 'İleri yıllarda zamanını ve bütçeni nasıl kullanacağını düşünmeye başladın.', '🗓️', 55, 67, [
      choice('Gelir ve gider planı çıkar', 'Beklentilerini gerçekçi bir plana yerleştirdin.', { knowledge: 4, stress: -6, flag: 'retirement_plan' }),
      choice('Yeni bir sosyal çevre kur', 'İş dışındaki hayatına daha çok yer açtın.', { happiness: 5, skillXP: { social: 6 }, meet: 'friend' }),
      choice('Şimdiki rutinine odaklan', 'Geleceği düşünmeyi erteledin ama günlük düzenini korudun.', { happiness: 2 })
    ], { once: true }),
    event('quiet_house', 'Ev biraz daha sessiz', 'Günlük koşuşturma azaldı. Sessizlik bazen huzur, bazen de yalnızlık gibi geliyor.', '🪟', 58, 100, [
      choice('Düzenli bir topluluğa katıl', 'Takviminde beklediğin bir gün ve yeni bir dost oldu.', { happiness: 7, skillXP: { social: 6 }, meet: 'friend', stress: -4 }),
      choice('Evde sevdiğin bir uğraşa dön', 'Sakinliğe bir ritim verdin.', { happiness: 4, knowledge: 3, stress: -5 }),
      choice('Yakınlarını aramak için adım at', 'Bir telefon konuşması gününü değiştirdi.', { bond: 5, happiness: 5 })
    ]),
    event('memory_box', 'Eski bir kutunun içinden', 'Bir çekmecede okul fotoğrafları, mektuplar ve unutulmuş biletler buldun.', '📦', 50, 100, [
      choice('Hikâyelerini yakınlarınla paylaş', 'Fotoğraflar uzun bir sohbete dönüştü.', { bond: 6, happiness: 6, stress: -4 }),
      choice('Anılarını yazıya geçir', 'Geçmişinden bir bölümü geleceğe bıraktın.', { knowledge: 3, happiness: 5, flag: 'memoir' }),
      choice('Sessizce gözden geçir', 'Değişen hayatına kendi hızında baktın.', { happiness: 3, stress: -5 })
    ], { once: true }),
    event('balance_class', 'Yavaşlamak, vazgeçmek değil', 'Toplum merkezinde ileri yaş için denge ve hareket grubu açılmış. Katılım ücretsiz.', '🧘', 60, 105, [
      choice('Hafif egzersiz grubuna katıl', 'Bedenine uygun hareketle kendini daha güvende hissettin.', { strength: 3, health: 5, happiness: 3, meet: 'friend' }),
      choice('Evde hafif bir rutin kur', 'Küçük ama sürdürülebilir bir alışkanlık başladın.', { health: 4, stress: -4 }),
      choice('Şimdilik yürüyüşle devam et', 'Kendi temponda hareket etmeyi seçtin.', { health: 2, happiness: 2 })
    ]),
    event('legacy_request', 'Bir gencin sorusu', 'Senden yaşça küçük biri, yaptığı bir seçim için tavsiye istiyor. Kendi gençliğini hatırladın.', '🕯️', 55, 105, [
      choice('Başarıların kadar hatalarını da anlat', 'Dürüst hikâyen karşılık buldu. Deneyimin işe yaradı.', { happiness: 7, skillXP: { social: 6 }, knowledge: 2 }),
      choice('Kararı onun adına vermeden dinle', 'Kendi cevabını bulmasına alan açtın.', { happiness: 5, skillXP: { social: 8 }, stress: -3 }),
      choice('Birlikte kaynak araştır', 'Yaş farkı birlikte öğrenmeye engel olmadı.', { knowledge: 4, happiness: 4 })
    ]),
    event('birthday_reflection', 'Kendin için küçük bir kutlama', 'Yeni yaşın büyük bir olayla gelmedi. Yine de geride bıraktığın yılın sende izleri var.', '🎂', 3, 110, [
      choice('Yakınlarınla sade bir gün geçir', 'Küçük bir kutlama sana ait olduğun bir yer olduğunu hatırlattı.', { happiness: 4, bond: 3, stress: -3 }),
      choice('Gelecek yıl için tek bir hedef seç', 'Her şeyi aynı anda istemek yerine bir adım belirledin.', { knowledge: 2, happiness: 2, stress: -2 }),
      choice('Sevdiğin bir şeyle kendini ödüllendir', 'Bütçene uygun küçük bir keyif günü güzelleştirdi.', { happiness: 6 }, { cost: 500 })
    ], { weight: 1, cooldown: 8 })
  ];

  const data = {
    version: 3,
    actions, items, careers, courses, events,
    categories: [
      { id: 'learning', name: 'Öğrenme', icon: '📚' },
      { id: 'social', name: 'Sosyal hayat', icon: '💬' },
      { id: 'health', name: 'Sağlık & bakım', icon: '🌿' },
      { id: 'work', name: 'İş & gelir', icon: '💼' },
      { id: 'creative', name: 'Yaratıcılık', icon: '🎨' },
      { id: 'outdoors', name: 'Açık hava', icon: '☀️' }
    ],
    names: ['Ece', 'Arda', 'Duru', 'Mert', 'Ada', 'Bora', 'İpek', 'Eren', 'Cem', 'Lara', 'Ozan', 'Naz', 'Defne', 'Kaan', 'Selin', 'Onur', 'Asya', 'Umut', 'İdil', 'Deniz', 'Mina', 'Kerem', 'Ela', 'Barış', 'Yağmur', 'Doruk', 'Elif', 'Can', 'Nehir', 'Aras', 'Gökçe', 'Emir'],
    surnames: ['Yılmaz', 'Kaya', 'Demir', 'Aydın', 'Arslan', 'Çelik', 'Yıldız', 'Şahin', 'Aksoy', 'Erdem', 'Güneş', 'Acar', 'Öztürk', 'Polat', 'Koç', 'Bulut'],
    cities: ['İstanbul', 'Ankara', 'İzmir', 'Eskişehir', 'Bursa', 'Antalya', 'Samsun', 'Konya', 'Mersin', 'Trabzon'],
    personalities: ['Sıcakkanlı', 'İçe dönük', 'Maceracı', 'Düşünceli', 'Hırslı', 'Esprili', 'Disiplinli', 'Duyarlı']
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  root.LifeData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
