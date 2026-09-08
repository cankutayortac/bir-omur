# Bir Ömür — denge notları

Ölçüm tarihi: 8 Eylül 2026. Güncel sürüm: 4.0. Bu dosya gelişim ve ekonomi düzeninin tasarım denemelerini kaydeder; uzun vadeli dengenin kusursuz olduğu iddiası değildir. Önceki kariyer borcu denemeleri aşağıda sürümleriyle korunur; yeni genetik başlangıca ait ölçüm olarak kullanılmamalıdır.

## 4.0 hayat yolları ve mesleki ekonomi

Başlangıç grupları ücretsizdir. İlk başvuru iki farklı hazırlık yılı gerektirir. Uzmanlaşma sonrasında ilk gelişim yılı takvim kararı açar: odaklı planın ilave anlık zaman maliyeti vardır; dengeli plan daha fazla ayrı gelişim yılı ister. Yetişkinlik görüşmesi 18 yaşından önce başlatılamaz ve sonucu sonraki yılda gelir. Ücretli sonucun ekipman/uzmanlık koşulları karşılanmıyorsa erteleme veya ücretsiz topluma katkı yolu vardır. Rota ödülleri ve sınırlı ek işler maaş değildir; emek geliri olarak alındığı yılda bir kez vergilenir.

Kıdem zamları yeni terfilerde %14 / %11 / %8 / %6 olarak azalır. Dört terfinin birleşik çarpanı eski 1,94 yerine yaklaşık 1,45'tir. Başlangıç maaşları, mevcut kaydedilmiş maaşlar ve temel giderler düşürülmez/yükseltilmez. Bu, yüksek kıdemde sınırsız rahatlamayı azaltmaya yönelik sınırlı bir değişikliktir; her ekonomik yolu eşitleme iddiası değildir.

`node scripts/path-balance-report.js` doğumdan yalnız gerçek motor eylemleriyle üç örnek yaşam çalıştırır. Akademik seed 11, spor seed 29, müzik seed 73; düzenli başlangıç işi, bakım, ekipman alışverişi ve gerçek yıllık zaman bütçesi kullanılır. Bunlar insan oyuncu davranışının temsili veya tüm rastgele başlangıçların garantisi değildir.

Bu üç örnekte profesyonel yol sonucu 19 yaşında açıldı; müzik yolu ilk fırsatta iki kez başarısız olup üçüncü başvuruda ilerledi. 32 yaşına kadar sırasıyla proje asistanı, kulüp sporcusu ve stüdyo müzisyeni işlerine geçildi; 14 / 14 / 10 meslek kararı oynandı. 18 yaş nakitleri 15.480 / 43.727 / 45.759 ₺ idi. 32 yaş nakitleri 4,75 / 4,29 / 3,39 milyon ₺; o yıllardaki daire fiyatları 3,93 / 3,87 / 3,83 milyon ₺ idi. Üçü de aile evinde kaldığından bu birikimler bağımsız kiracı bütçesine genellenemez. Ekipman almadan ortak kaynaklarla ilerleyen müzik/bestecilik alternatifi de ayrı entegrasyon testinde tamamlandı.

## Amaç ve değişiklikler

Zekâ, kuvvet ve güzelliği çocuklukta doldurmak yerine bir alana emek vermek, yeni yetkinlikler açmak ve yetişkinlikte hâlâ gelişebilmek hedefleniyor. Olumlu temel stat kazançları 40, 60, 80 ve 95 sonrasında kademeli azalır. Çocuklukta ek yumuşak sınırlar, aynı yıl tekrarda düşük verim, sağlık ve stresin öğrenmeye etkisi vardır. Küçük gelişimler onda bir puanla tutulur; olumsuz etkiler bu kazanç indirimiyle hafifletilmez.

3.3'te zekâ ve güzellik doğum puanları iki ebeveynin kurgusal özelliklerinden türetilir: her ebeveynin payı %40–60; en fazla ±14 rastgele farklılık; sonuç 15–75 aralığına sıkıştırılır. Bu değerler gerçek başlangıç statlarıdır, gizli tavan değildir. NPC özellikleri meslek/gelirden veya etnik kökenden hesaplanmaz. Oyuncu çocukları, oyuncunun doğuştan gelen profili ve diğer ebeveynin özelliklerinden etkilenir; eğitimle kazanılan puanlar kalıtsal kabul edilmez. Bu mekanik biyolojik bir model değildir.

Araştırma, spor, yaratıcılık ve iletişim kalıcı XP biriktirir. Basamaklar 40 / 140 / 330 / 680 / 1.200 XP'de açılır. Sekiz proje, meslek koşulları ve okul notu düşük yetişkinler için eğitime dönüş hazırlığı, yalnızca bar doldurmanın dışında hedefler sağlar. Günlük giriş serisi, gerçek zamanlı bekleme duvarı veya rastgele ücretli ödül sistemi yoktur.

## Tekrarlanabilir ölçüm

```sh
node scripts/balance-report.js --baseline
node scripts/balance-report.js
node --test progression.test.js
```

`--baseline` Git geçmişindeki `09647ff` içeriğini kullanır. Her strateji, aynı 1–12 tohumlu 12 yeni hayatı 50 yaşına kadar çalıştırır: zekâ, kuvvet, güzellik odaklı veya dengeli. Betik kitap, ayakkabı, gitar, bilgisayar ve bakım setini bütçesi yettiğinde alır, okul dışındaki yetişkinlikte başlangıç işine başvurur; düşük sağlık/yüksek streste dinlenmeyi önceliklendirir. Kalan zamanı görünür stat kazanımı/zaman oranını gözeterek kullanır. 18, 30 ve 50 yaş değerleri o yaşın eylemlerinden sonra ölçülür. Önceki karizma ile yeni güzellik aynı kavram olmadığından artık bire bir eski/yeni tablosu olarak sunulmaz.

Bu, iyi karar veren bir otomatik oyuncunun tasarım denemesidir; insan oyuncu davranışı veya istatistiksel temsil gücü yüksek bir örneklem değildir. Bu çalıştırmada her grupta 12 hayat da 50 yaşına ulaştı. Yeni olaylar ve rastgele sayı tüketimi değiştiğinden aynı tohum iki sürümde aynı hayat hikâyesi anlamına gelmez.

## Gelişim sonucu

3.3, bakım seti dahil güncel betik. Odaklı satırlar yalnızca odaklanılan statın ortalamasıdır. Dengeli satırlar zekâ / kuvvet / güzellik sırasındadır.

| Strateji | 18 yaş | 30 yaş | 50 yaş |
| --- | ---: | ---: | ---: |
| Zekâ odaklı | 70,3 | 85,9 | 97,0 |
| Kuvvet odaklı | 65,3 | 87,4 | 100 |
| Güzellik odaklı | 67,3 | 90,0 | 100 |
| Dengeli | 62,9 / 61,7 / 63,2 | 76,5 / 80,1 / 80,4 | 86,9 / 86,8 / 93,4 |

Bu denemede çocuklukta toplu 100 puana ulaşılmıyor. Tek bir alana onlarca yıl yatırım yapan karakter 50 yaşında 100'e ulaşabiliyor. Özellikle bakım seti olan dengeli karakterin güzelliği ileri yaşta diğer özelliklerden hızlı ilerliyor; ileride bakımın kalıcılığı/yaşlanma dengesi ayrıca değerlendirilmeli. Bu sürümde görünüşe bağlı özel yaşlanma kaybı yoktur. İnsan oyuncunun aynı etkinlikleri tekrar etmekten aldığı keyif yalnızca bu sayılardan çıkarılamaz.

## Ekonomi varsayımları ve bütçe

Tutarlar ve oranlar **kurgu oyun dengesi** içindir; Türkiye'nin güncel fiyat, maaş veya vergi verisi değildir. Şehir katsayıları, piyasa dönemleri, fiyat/ücret endeksleri, ailelerin kendi geçim ve yedek bütçeleri, bakım giderleri ve borç faizi birlikte hesaplanır. Fiyat endeksi 0,8–8 ile sınırlıdır; ücretler fiyatların belirli bir bandında ilerler. Vergi dilimleri de fiyatlarla ölçeklenir. Bu sınırlar simülasyonun yönetilebilir kalması içindir.

Aşağıdaki test, 25 yaşında, borçsuz, çocuksuz, envanteri boş bir market çalışanını; 240.000 ₺ yıllık brüt maaş ve 1,0 fiyat/ücret endeksiyle karşılaştırır. Net, yıllık gelir eksi giderdir; alışveriş ve beklenmeyen olaylar dahil değildir.

| Şehir / barınma | Eski yıllık net | Yeni yıllık net |
| --- | ---: | ---: |
| Ankara / aile evi | +108.000 ₺ | +43.200 ₺ |
| Ankara / paylaşımlı ev | +36.000 ₺ | +13.200 ₺ |
| Ankara / tek başına kira | −36.000 ₺ | −52.800 ₺ |
| İstanbul / aile evi | +108.000 ₺ | +13.380 ₺ |
| İstanbul / paylaşımlı ev | +36.000 ₺ | −25.740 ₺ |
| İstanbul / tek başına kira | −36.000 ₺ | −114.840 ₺ |

## Önceki 3.2 sürümünün kariyer yolu ve eğitim borcu denemesi

Ek bir gerçek motor denemesinde yeni hayatlara para/stat eklenmedi. Hekimlik için notlar ve bilgi, antrenörlük için kuvvet ve gerekli iletişim seviyesi hedeflendi; sağlık bakımı ihmal edilmedi. Tohum 1–3'te tıp eğitimi 18'de başlayıp hekimlik koşulları 24'te, antrenörlük eğitimi 18'de başlayıp iş koşulları 19'da tamamlandı. Hekimlikte bilgi 79,4–79,7 ve araştırma basamağı 3–4; antrenörlükte kuvvet 61,1–66 ve spor basamağı 2–3 oldu. Koşulu karşılamak işe kabul garantisi değildir.

Hekimlik denemesi 1–6 tohumla 40 yaşına uzatıldığında mezuniyet borcu 1,59–1,92 milyon ₺, işe giriş yaşı 24–26, borcun otomatik ödemelerle bitiş yaşı 27–30 çıktı. Bu altı başlangıç da Ankara'ydı; şehir çeşitliliği yoktur. 24'te işe giren örneklerde fiyat endeksi yaklaşık 1,77, yıllık brüt gelir 1,55–1,60 milyon ₺ ve anapara ödemesinden önce yıllık fazla 840–906 bin ₺ oldu. Enflasyon yüzünden nominal borç tek başına zorluk ölçüsü değildir.

Bu sonuç borcu hemen azaltmayı gerektirmiyor: test edilen yüksek gelirli rota çıkış sağlayabiliyor. Buna karşılık 40 yaşındaki 17,9–23,5 milyon ₺ nominal birikim; aile kurmayan, mülk almayan, optimize edilmiş üst kariyerlerin hâlâ çok rahatlayabildiğini gösteriyor. Sonraki testlerde farklı şehirler, eğitimden ayrılma, işe alınamama, çocuk giderleri ve düşük gelirli mezunlar ayrıca incelenmeli. Ayrı bir eğitim kredisi ve açık mezuniyet/geri ödeme öngörüsü, tüm borçları affetmekten daha anlaşılır bir gelecek tasarımı olabilir; mevcut sürümde ayrı eğitim kredisi yoktur.

## Eski kayıtlar

Önceden kazanılmış statlar geriye dönük düşürülmez. Belgeli eski eğitim ve meslek deneyimi uzmanlık geçişinde dikkate alınır. Yeni kazanç eğrisi sonraki eylemlere uygulanır. Yeni dengeyi baştan değerlendirmek için mevcut kaydı dışa aktarıp yeni bir hayat açmak önerilir; eski hayatı silmek zorunlu değildir.
