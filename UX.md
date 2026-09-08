# Bir Ömür 3.3 — tasarım kararları

## Ana döngü

Durumunu gör → bir seçim yap → gerçek etkisini gör → hayat günlüğüne dön → hazır olduğunda yılı ilerlet. BitLife'ın metin ve karar odaklı oyun akışı referans alındı; görselleri, marka öğeleri ve ekranları kopyalanmadı. Bir Ömür kendi lacivert, kobalt, mercan ve açık mavi dilini kullanıyor.

- Günlük merkezde. Aynı yılın anıları oluş sırasıyla, yıllar en yeniden eskiye gösterilir; eski yıllar isteğe bağlı açılır. Finans özeti ayrıntıları başlangıçta kapalıdır.
- Avatar, yaş, birikim ve altı durum barı kaydırmada görünür kalır. Telefon pencerelerinde de sabit barların altındaki karar alanı kendi içinde kayar.
- Tek yaş ilerletme düğmesi ekranın altındadır. Zaman puanı yanında görünür; kullanılmamış zaman için onay isteyen oyuncu Ayarlar'da hatırlatmayı açabilir. Varsayılan akışa fazladan onay eklenmez.
- Beş telefon sekmesi, masaüstünde altı sol menü vardır. Sağlık telefonda üst kalp düğmesinden ve hayat kısayolundan erişilebilir. Bakiye bütçeyi, avatar görünüm editörünü, karakter adı aile özelliklerini açar.
- Aktiviteler yaşa göre süzülür; arama, yapılabilirler ve favoriler ayrı filtrelerdir. Kilitli aktivitenin neden kilitli olduğu incelenebilir. Gerçek puan/XP, zaman ve güncel fiyatlar onaydan önce gösterilir. Arama ve favoriler zaman veya para tüketmez.
- Gelecek ekranı güncel durum, eğitimler ve iş ilanları olarak ayrıldı. İş ilanlarına ulaşmak için tüm eğitimleri kaydırmak gerekmez. Varlıklar ilk açılışta bütçeyi gösterir.
- NPC menüsünde önce sohbet ve birlikte zaman seçenekleri gelir; ayrılık ve anlaşmazlık geridedir. Tanışma, arkadaşlık ve yetişkin romantizmi açık karar olarak kalır.

## Gelişim hissi ve oyuncunun kontrolü

Tam sayı yerine onda bir puanlık gerçek kazanım; ayrı uzmanlık XP'si, sonraki basamaklar ve proje hedefleri ilerlemeyi görünür yapar. Genetik yalnızca başlangıç avantajıdır. Sohbet güzelliğe çevrilmez; iletişim emekle gelişen ayrı beceridir.

Bağlılığı hikâye, anlamlı tercihler ve erişilebilir hedeflerle desteklemek amaçlanır. Gerçek zamanlı bekleme, kaybedilecek günlük seri, zorunlu bildirim veya ücretli rastgele ödül eklenmedi. Güzellik/zekâ puanları karakterin değerini, kişiliğini ya da bir ilişkinin başarısını belirleyen hüküm değildir.

## Erişilebilirlik ve doğrulama

Yerleşik çevrimdışı fontlar, belirgin odak halkaları, metinli ikonlar, durum değişimi anonsları ve azaltılmış hareket tercihi desteklenir. Renk tek başına bilgi taşımaz; sayılar, açıklamalar ve +/− etiketleri de gösterilir. Uzun isimler ve küçük ekranlar için esnek satırlar kullanılır.

Motor ve arayüz regresyonları `npm test` ile çalıştırılır. Bu testler görsel yerleşim kanıtı değildir; telefon/masaüstü görünümü ve uzun pencere kaydırması tarayıcıda ayrıca kontrol edilir. Donanımlı iPhone/Android kurulum testinin yerini masaüstü emülasyonu tamamen tutmaz.

8 Eylül 2026 doğrulaması: 127 otomatik test geçti. Tarayıcıda 390×844, 320×568 ve 1280×900 görünümleri incelendi; ana menülerde yatay sayfa taşması görülmedi. Genetik tablosu, küçük telefonda uzun iş ilanları, sabit pencere barları, arama/favori, gerçek bakım kazanımı, tanışma seçimi ve altı yaş okul rehberi sınandı. Yerel PWA güncellemesi bekleyen okul kararını, yaşı, parayı ve özellikleri korudu. Bunlar cihaz emülasyonu sonuçlarıdır, fiziksel telefon testinin yerini tutmaz.
