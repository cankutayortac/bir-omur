# Bir Ömür · Yeni Bölüm

Türkçe, karar odaklı yaşam simülatörü. Doğumdan itibaren aile koşullarının, okulun, ilişkilerin, sağlığın ve ekonomik kararların birlikte şekillendirdiği bir hayat.

**Oyna:** https://cankutayortac.github.io/bir-omur/

## Telefonuna ekle

- **iPhone/iPad:** Yayın bağlantısını Safari'de aç → Paylaş → Ana Ekrana Ekle.
- **Android:** Chrome'da bağlantıyı aç → menü → Uygulamayı yükle / Ana ekrana ekle. Destekleyen tarayıcılarda oyun içindeki indirme simgesi de kullanılabilir.
- İlk açılışta dosyaların hazırlanması için internet gerekir. Ardından oyun çevrimdışı çalışır.
- Bu sürüm kurulabilir bir web uygulamasıdır (PWA); APK veya App Store paketi değildir.
- Yeni sürüm olduğunda Ayarlar içinde güncelleme seçeneği görünür. Kayıtlar korunur.

## Oyunun kapsamı

- 68 koşullu olay; altı yıllara yayılan hikâye zinciri.
- 36 aktivite: öğrenme, sosyal yaşam, üretim, çalışma, spor ve sağlık.
- 16 kariyer, 11 eğitim programı: not, diploma, burs, iş performansı ve terfi.
- Rastgele ebeveyn meslekleri, gerçek yıllık gelir hesabı ve çocukluk desteği.
- Bağımsız yaşlanan, iş değiştiren, hastalanan ve ölen NPC'ler; arkadaşlık, yetişkinler arasında ilişki, evlilik, çocuk ve ayrılık.
- 19 eşya: gerekli ekipmanlar, tüketilebilirler, araç ve ev; kullanım, değer kaybı, satış ve bakım.
- Yıllık maaş, vergi, kira, beslenme, eğitim, sağlık, çocuk gideri ve borç faizi.
- Sağlık, stres, geçici/kronik hastalık, takip, dinlenme, emeklilik ve ölüm özeti.
- Yaşla değişen katmanlı SVG karakterler; saç, sakal ve renk seçenekleri.
- Masaüstü, tablet ve telefon düzeni; cihazda otomatik kayıt, dosya olarak dışa/içe aktarma ve hayat arşivi.

Her yaş ilerletme bir tam yılı hesaplar. Eylemler bu yılın sınırlı zaman puanını kullanır. Olay çözülmeden zaman ilerletilemez; sayfayı yenilemek de kararı atlamaz. Sağlık ve ekonomi kuralları oyun için tasarlanmıştır.

## Yerel geliştirme

Node.js 20+ gerekir; paket kurulumu ve API anahtarı gerekmez.

```sh
npm start
```

http://localhost:8080 adresini aç. Yerel kayıt, yayın adresindeki kayıttan ayrıdır. Aktarmak için Ayarlar → Hayatını dosyaya kaydet / Kayıt dosyası yükle kullan.

```sh
npm test
```

Testler olay ve veri tutarlılığını, kayıt devamlılığını, ekipman/tüketim sınırlarını, tam yıllık bütçeyi, eğitim ve sağlık yollarını, sosyal etkileşim kısıtlarını ve 24 tam yaşamı doğrular.

## Dosyalar

- `engine.js`: tarayıcıdan bağımsız, seed ile tekrarlanabilir oyun motoru.
- `content.js`: aktiviteler, olaylar, eşyalar, eğitim ve kariyer verileri.
- `avatar.js`: yaşa ve görünüm seçeneklerine göre SVG karakter çizimi.
- `game.js`, `styles.css`, `index.html`: arayüz ve kayıt yönetimi.
- `manifest.webmanifest`, `sw.js`, `pwa.js`: kurulum, çevrimdışı dosyalar ve güncelleme akışı.
- `engine.test.js`: oyun kurallarının regresyon testleri.

Kayıtlar tarayıcıda `birOmur.v3` anahtarıyla saklanır. Eski kayıt ilk aktarımda `birOmur.backup-v2` anahtarıyla yedeklenir. Hayat arşivi en son sekiz kaydı tutar; daha eski hayatları dosyaya aktarabilirsin. Kayıtlar sunucuya gönderilmez ve cihazlar arasında kendiliğinden eşitlenmez.

## Yeni sürüm yayınlamak

Statik dosyalar GitHub Pages üzerinden sunulur. Kod güncellendiğinde `sw.js` içindeki CACHE sürümünü de yükselt; kurulu uygulamalar böylece yeni dosyaları birlikte alır. Üretimde yayınlanan mevcut cache sürümünün içeriğini tekrar kullanma.

Google Fonts bağlantısı tipografi için kullanılır; bağlantı olmadığında yerleşik yazı tipleri devreye girer. Eski raster prototip görseli `assets/` içinde kaynak olarak saklanmıştır; yeni sürüm karakterleri kodla çizer.
