# Bir Ömür 3.3.1 — tasarım kararları

## Ana döngü

Durumunu gör → bir seçim yap → gerçek etkisini gör → hayat günlüğüne dön → hazır olduğunda yılı ilerlet. BitLife'ın metin ve karar odaklı oyun akışı referans alındı; görselleri, marka öğeleri ve ekranları kopyalanmadı. Bir Ömür koyu kömür/lacivert zemin, sakin mavi vurgu ve açık metin kullanıyor; renkler esas olarak durum ve seçim bilgisini ayırıyor. Tekrarlanan üst etiketler ve slogan başlıkları azaltıldı; gölgeler kaldırıldı.

- Günlük merkezde. Aynı yılın anıları oluş sırasıyla, yıllar en yeniden eskiye gösterilir; eski yıllar isteğe bağlı açılır. Finans özeti ayrıntıları başlangıçta kapalıdır.
- Avatar, yaş, birikim ve altı durum barı kaydırmada görünür kalır. Telefon pencerelerinde de sabit barların altındaki karar alanı kendi içinde kayar.
- Tek yaş ilerletme düğmesi ekranın altındadır. Zaman puanı yanında görünür; kullanılmamış zaman için onay isteyen oyuncu Ayarlar'da hatırlatmayı açabilir. Varsayılan akışa fazladan onay eklenmez.
- Beş telefon sekmesi, masaüstünde altı sol menü vardır. Sağlık telefonda üst kalp düğmesinden ve hayat kısayolundan erişilebilir. Bakiye bütçeyi, avatar görünüm editörünü, karakter adı aile özelliklerini açar.
- Aktiviteler yaşa göre süzülür; arama, yapılabilirler ve favoriler ayrı filtrelerdir. Karttaki gerçek puan/XP, zaman ve fiyatlar tek dokunuştan önce görünür. Tekrarlanan zorunlu açıklama penceresi kaldırıldı; sağdaki ⓘ salt okunur ayrıntıları açar. Arama, bilgi ve favoriler zaman veya para tüketmez. Sağlık ve proje ekranları da aynı tek dokunuş akışını kullanır.
- Yalnızca büyük aktivite harcamalarında ücret, mevcut bakiye ve kalan bakiyeyi gösteren kısa onay vardır. Eşik fiyat endeksiyle ölçeklenen 5.000 ₺; ayrıca en az endeksli 1.000 ₺ olup kullanılabilir nakdin %25'ini kullanan harcamalar da korunur. Yaş/ekipman/para uygunluğu önce kontrol edilir. İptal kaynak tüketmez. Eski bir kartın tıklaması yeniden çizimden sonra ikinci işlem sayılmaz; harcama onayı da kapandıktan sonra tekrar kullanılamaz.
- Gelecek ekranı güncel durum, eğitimler ve iş ilanları olarak ayrıldı. İş ilanlarına ulaşmak için tüm eğitimleri kaydırmak gerekmez. Varlıklar ilk açılışta bütçeyi gösterir.
- NPC menüsünde önce sohbet ve birlikte zaman seçenekleri gelir; ayrılık ve anlaşmazlık geridedir. Tanışma, arkadaşlık ve yetişkin romantizmi açık karar olarak kalır.

## Gelişim hissi ve oyuncunun kontrolü

Tam sayı yerine onda bir puanlık gerçek kazanım; ayrı uzmanlık XP'si, sonraki basamaklar ve proje hedefleri ilerlemeyi görünür yapar. Genetik yalnızca başlangıç avantajıdır. Sohbet güzelliğe çevrilmez; iletişim emekle gelişen ayrı beceridir.

Bağlılığı hikâye, anlamlı tercihler ve erişilebilir hedeflerle desteklemek amaçlanır. Gerçek zamanlı bekleme, kaybedilecek günlük seri, zorunlu bildirim veya ücretli rastgele ödül eklenmedi. Güzellik/zekâ puanları karakterin değerini, kişiliğini ya da bir ilişkinin başarısını belirleyen hüküm değildir.

## Erişilebilirlik ve doğrulama

Yerleşik çevrimdışı fontlar, belirgin odak halkaları, metinli ikonlar, durum değişimi anonsları ve azaltılmış hareket tercihi desteklenir. Renk tek başına bilgi taşımaz; sayılar, açıklamalar ve +/− etiketleri de gösterilir. Uzun isimler ve küçük ekranlar için esnek satırlar kullanılır.

Motor ve arayüz regresyonları `npm test` ile çalıştırılır. Bu testler görsel yerleşim kanıtı değildir; telefon/masaüstü görünümü ve uzun pencere kaydırması tarayıcıda ayrıca kontrol edilir. Donanımlı iPhone/Android kurulum testinin yerini masaüstü emülasyonu tamamen tutmaz.

3.3 sürümünün doğrulaması (8 Eylül 2026): 127 otomatik test geçti. Tarayıcıda genetik tablosu, uzun iş ilanları, sabit pencere barları, gerçek bakım kazanımı, tanışma seçimi ve altı yaş okul rehberi sınandı. Yerel PWA güncellemesi bekleyen okul kararını, yaşı, parayı ve özellikleri korudu.

3.3.1 doğrulaması: 136 otomatik test geçti. Koyu arayüz 390×844, 320×568 ve 1280×900 görünümlerinde incelendi. Küçük telefonda uzun karakter adı yaşı gizlemedi; incelenen sayfalarda yatay taşma görülmedi. Favoriden tek dokunuşla dinlenme, salt okunur bilgi penceresi ve kategori/arama/yapılabilirler birlikte sınandı. 12.000 ₺ ehliyet kursunun onayı 20.000 ₺ bakiyeden 8.000 ₺ kalacağını doğru gösterdi; iptal para veya zaman tüketmedi, kabul yalnızca bir kez 12.000 ₺ ve 2 zaman tüketti. Tüm altı durum barı onay penceresinde görünür kaldı. Yerel PWA güncellemesi mevcut test hayatını korudu. Bunlar cihaz emülasyonu sonuçlarıdır; fiziksel telefon kurulum testinin yerini tutmaz.
