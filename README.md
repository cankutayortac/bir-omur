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

- 81 koşullu olay; altı yıllara yayılan hikâye zinciri ve bağlama uygun NPC karşılaşmaları.
- 46 aktivite: öğrenme, sosyal yaşam, üretim, çalışma, spor ve sağlık; sekiz uzmanlık projesi.
- Bilgi/kuvvet/karizmada kademeli yavaşlayan gelişim; aynı yıl tekrarında azalan kazanım, sağlık/stres verimi ve onda bir puanlık görünür ilerleme.
- Araştırma, spor, yaratıcılık ve iletişimde kalıcı XP; altı basamak, sonraki hedef ve proje/meslek kapıları.
- 16 kariyer, 11 eğitim programı: not, diploma, burs, iş performansı ve terfi.
- Rastgele ebeveyn meslekleri, gerçek yıllık gelir hesabı ve çocukluk desteği.
- Bağımsız yaşlanan, iş değiştiren, hastalanan ve ölen NPC'ler; arkadaşlık, yetişkinler arasında ilişki, evlilik, çocuk ve ayrılık.
- Tanışıklık ve arkadaşlık ayrı; yeni tanışma ve karşılıklı yetişkin ilgisi oyuncunun seçtiği olay pencereleriyle ilerler. Romantik dil nüktedan ve imalıdır, açık cinsel betimleme içermez.
- Yakınlıktan ayrı güven, hatıralar, isteğe bağlı gelecek yıl sözleri, kırgınlık/onarım ve süreli iş referansı.
- 19 eşya: gerekli ekipmanlar, tüketilebilirler, araç ve ev; kullanım, değer kaybı, satış ve bakım.
- Yıllık maaş, vergi, kira, beslenme, eğitim, sağlık, çocuk gideri ve borç faizi.
- Şehre göre geçim, ayrı fiyat/ücret endeksleri, piyasa dönemleri, ortak ve sınırlı aile destek havuzu; emek gelirinin yıl sonunda tek kez vergilendirilmesi.
- Nakit tamponunu koruyan anapara ödemesi, taşınma karşılaştırması ve burs sonrası öğrenim bütçesi tahmini. İş ve eğitim serbest zamanı azaltır; yılda en fazla iki iş başvurusu.
- Sağlık, stres, geçici/kronik hastalık, takip, dinlenme, emeklilik ve ölüm özeti.
- Yaşla değişen katmanlı SVG karakterler; saç, sakal ve renk seçenekleri.
- Masaüstü, tablet ve telefon düzeni; cihazda otomatik kayıt, dosya olarak dışa/içe aktarma ve hayat arşivi.
- Tüm menülerde kaydırırken görünür kalan durum barları; son eylemin puan değişimleri.
- Yaş ilerleyince otomatik açılan olay penceresi; olay ve ilişki pencerelerinde sabit durum barları, bağımsız kaydırılan seçenekler.
- Okul başlangıçları/mezuniyet, kardeş doğumu, yeni eğitim, ebeveynlik, sağlık ve uzmanlık değişimlerinde kayıtla korunan kısa rehber pencereleri.

Her yaş ilerletme bir tam yılı hesaplar. Eylemler bu yılın sınırlı zaman puanını kullanır. Olay çözülmeden zaman ilerletilemez; sayfayı yenilemek de kararı atlamaz. Sağlık ve ekonomi kuralları oyun için tasarlanmıştır.

Olay penceresini kapatmak kararı iptal etmez. Menülerde durumunu inceledikten sonra **Olayı aç / Olaya dön** ile devam edebilirsin. Bekleyen olay, kayıt açıldığında tekrar görünür. Barların yanındaki +/− değerler son başarılı eylemin gerçek değişimini gösterir; streste azalma olumludur.

Bilgi pencereleri aynı anda en fazla üç kısa not gösterir; devam düğmesi, X veya Escape bu notları okundu sayar ve sıradaki bildirimi/kararı açar. Henüz onaylamadan çıkarsan notlar kayıtla korunur. Bir söz verirsen **gelecek yaşında** o kişiyle birlikte vakit geçir; söz, bu yaşın tamamı geçmeden bozulmuş sayılmaz.

3.2 güncellemesi eski puanları, para ve ilişkileri geri almaz. Yeni gelişim eğrisini doğumdan deneyimlemek için mevcut hayatını arşivleyip yeni hayat başlatabilirsin. Ölçülmüş eski/yeni karşılaştırması ve denge sınırları: [BALANCE.md](BALANCE.md). Bu bir ilk kapsamlı denge geçişidir; özellikle ileri kariyer ekonomisi için oyun testleri sürecektir.

## Yerel geliştirme

Node.js 20+ gerekir; paket kurulumu ve API anahtarı gerekmez.

```sh
npm start
```

http://localhost:8080 adresini aç. Yerel kayıt, yayın adresindeki kayıttan ayrıdır. Aktarmak için Ayarlar → Hayatını dosyaya kaydet / Kayıt dosyası yükle kullan.

```sh
npm test
```

Testler olay ve veri tutarlılığını, kayıt devamlılığını, ekipman/tüketim sınırlarını, tam yıllık bütçeyi, eğitim ve sağlık yollarını, sosyal etkileşim kısıtlarını ve 24 tam yaşamı doğrular. Arayüz testleri kalıcı durum barlarını, otomatik olay penceresini, kapatma/yeniden açma akışını, seçim sonrası güncellemeyi ve kayıt içe aktarmayı kontrol eder.

## Dosyalar

- `engine.js`: tarayıcıdan bağımsız, seed ile tekrarlanabilir oyun motoru.
- `content.js`: aktiviteler, olaylar, eşyalar, eğitim ve kariyer verileri.
- `progression.js`: kademeli stat gelişimi, uzmanlık XP ve proje basamakları.
- `economy.js`: geçim, gelir/ücret endeksleri, aile desteği, vergi ve borç hesabı.
- `relationships.js`: güven, hafıza, sözler ve seçimli tanışma/romantizm olayları.
- `avatar.js`: yaşa ve görünüm seçeneklerine göre SVG karakter çizimi.
- `game.js`, `styles.css`, `index.html`: arayüz ve kayıt yönetimi.
- `manifest.webmanifest`, `sw.js`, `pwa.js`: kurulum, çevrimdışı dosyalar ve güncelleme akışı.
- `engine.test.js`: oyun kurallarının regresyon testleri.
- `ui.test.js`: gerçek arayüz koduyla olay penceresi ve durum barı regresyon testleri (görsel yerleşim ayrıca tarayıcıda test edilir).
- `*.test.js`: uzmanlık, ekonomi, NPC hafızası ve gerçek motor akışlarının entegrasyon testleri.
- `scripts/balance-report.js`: `npm run balance` ile tekrarlanabilir 48 hayat/strateji karşılaştırması; `--baseline` önceki sürümü Git geçmişinden okur.

Kayıtlar tarayıcıda `birOmur.v3` anahtarıyla saklanır. Eski kayıt ilk aktarımda `birOmur.backup-v2` anahtarıyla yedeklenir. Hayat arşivi en son sekiz kaydı tutar; daha eski hayatları dosyaya aktarabilirsin. Kayıtlar sunucuya gönderilmez ve cihazlar arasında kendiliğinden eşitlenmez.

## Yeni sürüm yayınlamak

Statik dosyalar GitHub Pages üzerinden sunulur. Kod güncellendiğinde `sw.js` içindeki CACHE sürümünü de yükselt; kurulu uygulamalar böylece yeni dosyaları birlikte alır. Üretimde yayınlanan mevcut cache sürümünün içeriğini tekrar kullanma.

Google Fonts bağlantısı tipografi için kullanılır; bağlantı olmadığında yerleşik yazı tipleri devreye girer. Eski raster prototip görseli `assets/` içinde kaynak olarak saklanmıştır; yeni sürüm karakterleri kodla çizer.
