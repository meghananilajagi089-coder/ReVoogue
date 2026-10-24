/* data.js — window.RW_DATA only. Seeds: 126 products (generator), sellers, orders, FAQs, etc. */
(function(){
'use strict';

/* ---- §9 compact product table (verbatim) ---- */
var RAW = [
'1001|Floral Wrap Dress|Zara|Women>Dresses|M|LN|1|N|3200|1100|Multi|Viscose|Casual,Brunch|S01',
'1002|Satin Slip Midi Dress|H&M|Women>Dresses|S|LN|1|N|2499|1250|Champagne|Satin|Party,Date|S03',
'1003|Black Bodycon Party Dress|Vero Moda|Women>Dresses|M|EX|2|N|2799|900|Black|Polyester|Party|S05',
'1004|Mustard Tiered Maxi Dress|Mango|Women>Dresses|L|EX|2|N|4290|1500|Mustard|Cotton|Casual,Vacation|S09',
'1005|Maroon Cocktail Gown|AND|Women>Dresses|M|LN|1|N|12000|4500|Maroon|Crepe|Party,Wedding|S11',
'1006|Sequin Party Top|Forever 21|Women>Tops|S|LN|1|N|2800|900|Silver|Sequin|Party|S03',
'1007|White Linen Shirt|Marks & Spencer|Women>Tops|M|EX|2|N|3200|1900|White|Linen|Office,Casual|S01',
'1008|Off-Shoulder Ruffle Top|Only|Women>Tops|S|LN|0|Y|1499|900|Peach|Polyester|Casual,Date|S05',
'1009|Printed Peplum Top|Global Desi|Women>Tops|L|GD|4|N|1699|450|Blue|Cotton|Casual,Office|S07',
'1010|Cotton Printed Kurta Set|Biba|Women>Kurtas & Sets|M|EX|3|N|3999|2200|Teal|Cotton|Casual,Festive|S07',
'1011|Chikankari Straight Kurta|Fabindia|Women>Kurtas & Sets|L|LN|1|N|2990|1800|White|Cotton|Festive,Casual|S11',
'1012|Silk Anarkali Set|Libas|Women>Kurtas & Sets|S|EX|2|N|8500|3200|Emerald|Silk|Wedding,Festive|S09',
'1013|Indigo Block-Print Kurta|Fabindia|Women>Kurtas & Sets|M|GD|5|N|1990|600|Indigo|Cotton|Casual|S01',
'1014|Red Banarasi Silk Saree|Boutique|Women>Sarees|Free|EX|1|N|14000|5500|Red|Silk|Wedding,Festive|S11',
'1015|Pastel Chanderi Saree|Fabindia|Women>Sarees|Free|LN|1|N|5500|3200|Pastel Green|Chanderi|Festive,Puja|S03',
'1016|Georgette Saree Sequin Border|Soch|Women>Sarees|Free|LN|1|N|6800|2400|Wine|Georgette|Party,Wedding|S05',
'1017|Cotton Handloom Saree|Handloom Co.|Women>Sarees|Free|GD|6|N|3200|900|Rust|Cotton|Casual,Office|S07',
'1018|Teal Bridal-Guest Lehenga|Mohey|Women>Lehengas & Sharara|M|LN|0|Y|22000|8500|Teal|Net|Wedding|S09',
'1019|Pink Sharara Set|Indya|Women>Lehengas & Sharara|S|EX|2|N|6990|2600|Pink|Georgette|Festive,Wedding|S01',
'1020|High-Rise Mom Jeans|Levi\'s|Women>Bottoms|28|EX|3|N|4299|1500|Blue|Denim|Casual|S03',
'1021|Pleated Wide-Leg Trousers|Zara|Women>Bottoms|M|LN|2|N|3590|2000|Beige|Polyester|Office,Casual|S05',
'1022|Black Tailored Blazer|Zara|Women>Jackets|M|LN|1|N|6000|2400|Black|Poly Blend|Office,Party|S11',
'1023|Denim Jacket|Levi\'s|Women>Jackets|L|GD|4|N|5500|2000|Blue|Denim|Casual,Winter|S07',
'1024|Faux-Leather Biker Jacket|H&M|Women>Jackets|S|EX|2|N|4999|1800|Black|Faux Leather|Casual,Winter|S09',
'1025|Sky-Blue Linen Shirt|Allen Solly|Men>Shirts|L|LN|2|N|2200|1300|Sky Blue|Linen|Casual,Office|S02',
'1026|Formal White Shirt|Van Heusen|Men>Shirts|40|LN|0|Y|1899|1200|White|Cotton|Office|S04',
'1027|Checked Casual Shirt|U.S. Polo Assn.|Men>Shirts|M|EX|3|N|2499|750|Red Check|Cotton|Casual|S06',
'1028|Oxford Button-Down Shirt|Tommy Hilfiger|Men>Shirts|L|EX|2|N|5999|2000|Light Blue|Cotton|Office,Casual|S08',
'1029|Graphic Tee|H&M|Men>T-shirts|M|GD|4|N|799|200|Black|Cotton|Casual|S10',
'1030|Polo T-shirt|Puma|Men>T-shirts|L|EX|3|N|1999|600|Navy|Cotton Blend|Casual,Sports|S12',
'1031|Dri-Fit Training Tee|Nike|Men>T-shirts|M|GD|5|N|1795|450|Grey|Polyester|Sports|S02',
'1032|Cream Wedding Sherwani|Manyavar|Men>Ethnic|40|EX|1|N|18000|6500|Cream|Brocade|Wedding|S04',
'1033|Maroon Silk Kurta-Pyjama Set|Manyavar|Men>Ethnic|L|LN|1|N|5500|2000|Maroon|Silk|Festive,Wedding|S06',
'1034|Navy Nehru Jacket|Raymond|Men>Ethnic|42|LN|1|N|4500|2800|Navy|Wool Blend|Wedding,Festive|S08',
'1035|Slim-Fit Jeans Dark Wash|Levi\'s|Men>Bottoms|32|GD|5|N|3999|1100|Dark Blue|Denim|Casual|S10',
'1036|Khaki Chinos|Peter England|Men>Bottoms|32|GD|5|N|2500|700|Khaki|Cotton|Casual,Office|S12',
'1037|Charcoal Formal Trousers|Raymond|Men>Bottoms|34|EX|2|N|2999|1000|Charcoal|Poly Viscose|Office|S02',
'1038|Navy Two-Piece Suit|Raymond|Men>Formal|40|EX|2|N|14999|5500|Navy|Wool Blend|Office,Wedding|S04',
'1039|Black Tuxedo Jacket|Van Heusen|Men>Formal|40|LN|1|N|9999|3800|Black|Wool Blend|Party,Wedding|S06',
'1040|Beige Casual Blazer|Marks & Spencer|Men>Formal|L|EX|2|N|7999|4500|Beige|Linen Blend|Office,Casual|S08',
'1041|Charcoal Wool Overcoat|Zara|Men>Outerwear|XL|EX|3|N|9000|5200|Charcoal|Wool|Winter,Office|S10',
'1042|Grey Zip Hoodie|Adidas|Men>Outerwear|L|GD|5|N|3999|1200|Grey|Fleece|Casual,Winter,Sports|S12',
'1043|Olive Puffer Jacket|The North Face|Men>Outerwear|M|EX|2|N|9999|3800|Olive|Nylon|Winter|S02',
'1044|Bomber Jacket|Roadster|Men>Outerwear|L|GD|4|N|2999|800|Black|Nylon|Casual,Winter|S04',
'1045|Kids Kurta Set|Fabindia|Kids>Boys|6-7 yrs|LN|1|N|1800|1000|Mustard|Cotton|Festive|S07',
'1046|Girls Pink Party Frock|Mothercare|Kids>Girls|4-5 yrs|LN|0|Y|2200|1300|Pink|Net|Party,Birthday|S01',
'1047|Boys Sherwani Set|Manyavar|Kids>Boys|8-9 yrs|EX|1|N|4500|1500|Ivory|Brocade|Wedding|S08',
'1048|Denim Dungaree|H&M|Kids>Girls|3-4 yrs|EX|2|N|1499|400|Blue|Denim|Casual|S05',
'1049|Girls Lehenga Choli|Biba|Kids>Girls|7-8 yrs|LN|0|Y|3499|1100|Orange|Silk Blend|Festive,Wedding|S03',
'1050|Kids Winter Jacket|Marks & Spencer|Kids>Boys|5-6 yrs|EX|2|N|3299|1000|Red|Nylon|Winter|S10',
'1051|Pashmina Stole|Fabindia|Accessories>Stoles & Scarves|Free|LN|0|Y|3500|2200|Beige|Pashmina|Winter,Festive|S09',
'1052|Tan Leather Belt|Tommy Hilfiger|Accessories>Belts|34|GD|4|N|2499|1400|Tan|Leather|Office,Casual|S06',
'1053|Silk Tie Set (3)|Raymond|Accessories>Ties|Free|LN|1|N|2200|1100|Assorted|Silk|Office,Wedding|S12',
'1054|Gold Embroidered Clutch|Zara|Accessories>Bags|Free|LN|0|Y|2990|1500|Gold|Fabric|Party,Wedding|S11',
'1055|Woollen Muffler|Allen Solly|Accessories>Stoles & Scarves|Free|EX|2|N|1299|700|Grey|Wool|Winter|S02',
'1056|Bandhani Dupatta|Fabindia|Accessories>Dupattas|Free|LN|0|Y|2200|1400|Multi|Silk|Festive|S07',
/* ---- +70: 20 Women (1057-1076) ---- */
'1057|Linen Shirt Dress|Mango|Women>Dresses|S|LN|1|N|3499|1450|Beige|Linen|Casual,Brunch|S03',
'1058|Cotton Fit & Flare Dress|Only|Women>Dresses|M|EX|2|N|2699|950|Coral|Cotton|Casual,Date|S05',
'1059|Velvet Wrap Party Dress|H&M|Women>Dresses|L|LN|1|N|3999|1600|Wine|Velvet|Party|S07',
'1060|Printed Shirt Dress|Zara|Women>Dresses|M|GD|4|N|2999|850|Blue|Cotton|Casual|S01',
'1061|Ruffle Sleeve Blouse|Vero Moda|Women>Tops|S|LN|1|N|2499|999|White|Cotton|Office,Casual|S09',
'1062|Satin Bow-Neck Blouse|Only|Women>Tops|M|EX|2|N|2299|950|Champagne|Satin|Office,Party|S11',
'1063|Knit Crewneck Top|H&M|Women>Tops|L|GD|5|N|1499|450|Olive|Cotton Blend|Casual,Winter|S02',
'1064|Striped Cotton Top|Global Desi|Women>Tops|M|EX|3|N|1699|600|Red Check|Cotton|Casual|S04',
'1065|Ikat Cotton Kurta|Fabindia|Women>Kurtas & Sets|L|EX|2|N|2490|1400|Indigo|Cotton|Casual,Festive|S01',
'1066|Angrakha Style Kurta|Libas|Women>Kurtas & Sets|S|LN|1|N|3299|1850|Mustard|Cotton|Festive,Casual|S07',
'1067|Pastel Kota Doria Kurta|Soch|Women>Kurtas & Sets|M|GD|4|N|1899|650|Pastel Green|Cotton|Puja,Casual|S05',
'1068|Organza Party Saree|Soch|Women>Sarees|Free|LN|1|N|7500|3400|Silver|Organza|Party,Wedding|S09',
'1069|Kalamkari Handloom Saree|Handloom Co.|Women>Sarees|Free|EX|2|N|4200|1600|Rust|Cotton|Office,Festive|S11',
'1070|Sequin Georgette Saree|Boutique|Women>Sarees|Free|GD|5|N|5800|1500|Teal|Georgette|Party|S03',
'1071|Velvet Embroidered Lehenga|Mohey|Women>Lehengas & Sharara|M|LN|0|N|18500|7200|Maroon|Velvet|Wedding,Festive|S11',
'1072|Floral Print Sharara Set|Indya|Women>Lehengas & Sharara|S|EX|2|N|5499|2100|Pink|Georgette|Festive,Party|S05',
'1073|High-Waist Palazzo Trousers|Zara|Women>Bottoms|M|LN|1|N|2899|1350|Cream|Viscose|Office,Casual|S03',
'1074|Straight-Fit Culottes|Only|Women>Bottoms|S|GD|4|N|1999|700|Khaki|Cotton|Casual|S07',
'1075|Quilted Puffer Vest|Marks & Spencer|Women>Jackets|L|EX|2|N|4499|1800|Charcoal|Nylon|Winter,Casual|S09',
'1076|Cropped Denim Jacket|H&M|Women>Jackets|M|LN|1|N|3299|1450|Sky Blue|Denim|Casual|S01',
/* ---- +20 Men (1077-1096) ---- */
'1077|Linen Cuban-Collar Shirt|Allen Solly|Men>Shirts|M|EX|2|N|2599|1250|Olive|Linen|Casual,Vacation|S02',
'1078|Flannel Check Shirt|Roadster|Men>Shirts|L|GD|5|N|2199|750|Rust|Cotton|Casual,Winter|S04',
'1079|Striped Formal Shirt|Van Heusen|Men>Shirts|40|LN|1|N|1999|1150|Light Blue|Cotton|Office|S06',
'1080|Linen Resort Shirt|Fabindia|Men>Shirts|XL|EX|3|N|2799|1300|Cream|Linen|Casual,Vacation|S08',
'1081|Solid Crew Tee|U.S. Polo Assn.|Men>T-shirts|L|LN|1|N|1499|650|Navy|Cotton|Casual|S10',
'1082|Running Dri-Fit Tee|Nike|Men>T-shirts|M|GD|5|N|1995|700|Black|Polyester|Sports|S12',
'1083|Raglan Sleeve Tee|Puma|Men>T-shirts|S|EX|2|N|1599|600|Grey|Cotton Blend|Casual,Sports|S02',
'1084|Printed Oversized Tee|H&M|Men>T-shirts|XL|GD|4|N|1299|400|Mustard|Cotton|Casual|S04',
'1085|Chikankari Kurta|Fabindia|Men>Ethnic|L|LN|1|N|3490|2100|White|Cotton|Festive,Casual|S06',
'1086|Bandhani Print Kurta|Manyavar|Men>Ethnic|M|EX|2|N|2999|1500|Orange|Cotton|Festive,Puja|S08',
'1087|Silk Nehru Jacket|Raymond|Men>Ethnic|40|LN|0|N|5200|3100|Gold|Silk Blend|Wedding|S10',
'1088|Tapered Joggers|Adidas|Men>Bottoms|32|EX|2|N|2599|1100|Grey|Fleece|Sports,Casual|S12',
'1089|Stretch Chinos|Peter England|Men>Bottoms|34|LN|1|N|2799|1450|Navy|Cotton|Office,Casual|S02',
'1090|Distressed Slim Jeans|Levi\'s|Men>Bottoms|30|GD|5|N|4299|1400|Dark Blue|Denim|Casual|S10',
'1091|Charcoal Windowpane Suit|Raymond|Men>Formal|42|EX|2|N|16999|7400|Charcoal|Wool Blend|Office,Wedding|S04',
'1092|Navy Linen Blazer|Allen Solly|Men>Formal|L|LN|1|N|7499|3900|Navy|Linen|Office,Casual|S06',
'1093|Checkered Waistcoat|Van Heusen|Men>Formal|M|GD|4|N|3499|1250|Red Check|Poly Blend|Office|S08',
'1094|Wool Blend Peacoat|Zara|Men>Outerwear|L|EX|2|N|8999|4600|Navy|Wool Blend|Winter,Office|S12',
'1095|Fleece Quarter-Zip|Adidas|Men>Outerwear|M|GD|5|N|2999|950|Olive|Fleece|Sports,Winter|S02',
'1096|Quilted Liner Jacket|The North Face|Men>Outerwear|S|LN|1|N|7999|3900|Charcoal|Nylon|Winter,Casual|S10',
/* ---- +20 Kids (1097-1116) ---- */
'1097|Boys Cotton Kurta Set|Fabindia|Kids>Boys|4-5 yrs|EX|2|N|1699|850|Sky Blue|Cotton|Festive|S01',
'1098|Dino Print T-shirt|H&M|Kids>Boys|3-4 yrs|LN|1|N|799|350|Olive|Cotton|Casual|S05',
'1099|Boys Chino Shorts|U.S. Polo Assn.|Kids>Boys|5-6 yrs|EX|3|N|1299|550|Khaki|Cotton|Casual|S07',
'1100|Boys Party Waistcoat Set|Mothercare|Kids>Boys|7-8 yrs|LN|0|N|3999|1600|Ivory|Poly Blend|Party,Wedding|S09',
'1101|Printed Night Suit|Marks & Spencer|Kids>Boys|6-7 yrs|GD|5|N|1499|500|Light Blue|Cotton|Casual|S02',
'1102|Boys Denim Overshirt|Levi\'s|Kids>Boys|8-9 yrs|EX|2|N|2299|950|Blue|Denim|Casual,Winter|S04',
'1103|Sports Track Pants|Puma|Kids>Boys|5-6 yrs|GD|4|N|1599|550|Navy|Polyester|Sports|S10',
'1104|Boys Linen Shirt|Allen Solly|Kids>Boys|4-5 yrs|LN|1|N|1499|750|White|Linen|Casual,Festive|S12',
'1105|Winter Fleece Hoodie|Adidas|Kids>Boys|9-10 yrs|EX|2|N|2199|850|Grey|Fleece|Winter|S06',
'1106|Boys Cotton Dungaree|H&M|Kids>Boys|2-3 yrs|LN|1|N|1899|900|Indigo|Denim|Casual|S03',
'1107|Girls Tutu Tulle Skirt|Mothercare|Kids>Girls|4-5 yrs|LN|1|N|1899|850|Pink|Net|Party,Birthday|S01',
'1108|Floral Summer Frock|Mothercare|Kids>Girls|3-4 yrs|EX|2|N|1799|700|Peach|Cotton|Casual,Birthday|S05',
'1109|Sequin Girls Lehenga|Biba|Kids>Girls|5-6 yrs|LN|1|N|3999|1550|Pink|Silk Blend|Festive|S07',
'1110|Printed Leggings Set|H&M|Kids>Girls|6-7 yrs|GD|4|N|1299|450|Multi|Cotton|Casual|S09',
'1111|Girls Party Frock|Mothercare|Kids>Girls|7-8 yrs|EX|1|N|2499|1050|Red|Net|Party,Birthday|S11',
'1112|Denim Skirt|Levi\'s|Kids>Girls|8-9 yrs|EX|2|N|1699|650|Blue|Denim|Casual|S04',
'1113|Girls Cotton Kurta|Fabindia|Kids>Girls|9-10 yrs|LN|1|N|1499|750|Mustard|Cotton|Festive,Casual|S12',
'1114|Satin Bow Dress|Only|Kids>Girls|2-3 yrs|LN|0|N|1999|899|Champagne|Satin|Party|S06',
'1115|Kids Winter Puffer|Marks & Spencer|Kids>Girls|5-6 yrs|EX|2|N|3499|1350|Maroon|Nylon|Winter|S10',
'1116|Twirl Cotton Dress|Only|Kids>Girls|4-5 yrs|GD|5|N|1599|500|Sky Blue|Cotton|Casual,Birthday|S02',
/* ---- +10 Accessories (1117-1126) ---- */
'1117|Straw Beach Tote|Zara|Accessories>Bags|Free|LN|1|N|2499|1100|Beige|Straw|Vacation,Casual|S11',
'1118|Quilted Sling Bag|H&M|Accessories>Bags|Free|EX|2|N|3299|1450|Black|Faux Leather|Casual,Party|S03',
'1119|Silk Pocket Squares (2)|Raymond|Accessories>Ties|Free|LN|0|N|1499|750|Assorted|Silk|Office,Wedding|S12',
'1120|Knit Tie|Tommy Hilfiger|Accessories>Ties|Free|EX|1|N|1899|950|Mustard|Wool|Office,Winter|S06',
'1121|Studded Leather Belt|H&M|Accessories>Belts|28|GD|4|N|1999|850|Black|Leather|Party,Casual|S01',
'1122|Weave Ratchet Belt|Peter England|Accessories>Belts|34|EX|2|N|1799|800|Tan|Leather|Office|S04',
'1123|Block-Print Stole|Fabindia|Accessories>Stoles & Scarves|Free|LN|1|N|2499|1450|Teal|Cotton|Winter,Festive|S07',
'1124|Wool Plaid Scarf|Zara|Accessories>Stoles & Scarves|Free|GD|4|N|1899|650|Red Check|Wool|Winter|S09',
'1125|Phulkari Dupatta|Boutique|Accessories>Dupattas|Free|LN|0|N|2699|1550|Multi|Silk|Festive,Wedding|S11',
'1126|Chiffon Ruffle Dupatta|Soch|Accessories>Dupattas|Free|EX|2|N|1999|850|Peach|Georgette|Festive,Party|S05'
];

/* ---- deterministic RNG seeded from id ---- */
function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var COLOR_HEX = {
  'Multi':'#8E6BBF','Champagne':'#E9D6B0','Black':'#2B2B2B','Mustard':'#D9A420','Maroon':'#7B2436',
  'Silver':'#B8BFC7','White':'#F4F1EA','Peach':'#F2B49B','Blue':'#3B6FB5','Teal':'#1F7A72',
  'Indigo':'#39457E','Red':'#C0392B','Pastel Green':'#B7D4B0','Wine':'#722F4E','Rust':'#B65C35',
  'Pink':'#E38AAE','Beige':'#D8C6A5','Sky Blue':'#9BC4E2','Light Blue':'#A8C8E8','Red Check':'#C75B4E',
  'Navy':'#243B63','Grey':'#9AA0A6','Dark Blue':'#2E4A7D','Khaki':'#B7A98A','Charcoal':'#4A4E52',
  'Olive':'#6B7A3A','Cream':'#F0E6CF','Tan':'#C09A6B','Assorted':'#6E8CA0','Gold':'#C9A227',
  'Orange':'#E07B39','Ivory':'#F3ECD8','Coral':'#E07A5F'
};

var CAT_TREE = {
  'Women': { subs: {
    'Dresses':          { sizeType:'letter', measurements:['Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'dress' },
    'Tops':             { sizeType:'letter', measurements:['Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'top' },
    'Kurtas & Sets':    { sizeType:'chest',  measurements:['Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'kurta' },
    'Sarees':           { sizeType:'free',   measurements:['Size','Dimensions'], shape:'saree' },
    'Lehengas & Sharara':{ sizeType:'chest', measurements:['Waist (cm)','Length (cm)','Flare (cm)'], shape:'lehenga' },
    'Bottoms':          { sizeType:'waist',  measurements:['Waist (cm)','Hip (cm)','Length (cm)'], shape:'trousers' },
    'Jackets':          { sizeType:'chest',  measurements:['Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'jacket' }
  }},
  'Men': { subs: {
    'Shirts':     { sizeType:'collar', measurements:['Collar (cm)','Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'shirt' },
    'T-shirts':   { sizeType:'letter', measurements:['Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'tee' },
    'Ethnic':     { sizeType:'chest',  measurements:['Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'ethnic' },
    'Bottoms':    { sizeType:'waist',  measurements:['Waist (cm)','Hip (cm)','Length (cm)'], shape:'trousers' },
    'Formal':     { sizeType:'chest',  measurements:['Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'suit' },
    'Outerwear':  { sizeType:'chest',  measurements:['Chest (cm)','Length (cm)','Sleeve (cm)'], shape:'coat' }
  }},
  'Kids': { subs: {
    'Boys':  { sizeType:'age', measurements:['Chest (cm)','Length (cm)'], shape:'kids' },
    'Girls': { sizeType:'age', measurements:['Chest (cm)','Length (cm)'], shape:'kids' }
  }},
  'Accessories': { subs: {
    'Stoles & Scarves': { sizeType:'free', measurements:['Size','Dimensions'], shape:'accessory' },
    'Belts':            { sizeType:'waist', measurements:['Size','Dimensions'], shape:'accessory' },
    'Ties':             { sizeType:'free', measurements:['Size','Dimensions'], shape:'accessory' },
    'Bags':             { sizeType:'free', measurements:['Size','Dimensions'], shape:'accessory' },
    'Dupattas':         { sizeType:'free', measurements:['Size','Dimensions'], shape:'accessory' }
  }}
};

var SELLERS = [
  { id:'S01', name:'Priya Sharma',    city:'Pune',      rating:4.6, ratingCount:84,  itemsSold:23, memberSinceYear:2022, avatarColor:'#4A5D4E', mobile:'9876543210' },
  { id:'S02', name:'Rohan Mehta',     city:'Mumbai',    rating:4.2, ratingCount:41,  itemsSold:14, memberSinceYear:2023, avatarColor:'#5C4033', mobile:'9822011223' },
  { id:'S03', name:'Ananya Krishnan', city:'Bengaluru', rating:4.8, ratingCount:126, itemsSold:37, memberSinceYear:2022, avatarColor:'#3C4C40', mobile:'9845077889' },
  { id:'S04', name:'Aditya Patil',    city:'Pune',      rating:4.0, ratingCount:29,  itemsSold:9,  memberSinceYear:2024, avatarColor:'#6E6156', mobile:'9860123456' },
  { id:'S05', name:'Sneha Reddy',     city:'Hyderabad', rating:4.5, ratingCount:67,  itemsSold:19, memberSinceYear:2023, avatarColor:'#8E372C', mobile:'9849055667' },
  { id:'S06', name:'Karan Thakur',    city:'Delhi',     rating:3.9, ratingCount:22,  itemsSold:6,  memberSinceYear:2025, avatarColor:'#1B1B1B', mobile:'9811099887' },
  { id:'S07', name:'Meera Joshi',     city:'Ahmedabad', rating:4.7, ratingCount:98,  itemsSold:28, memberSinceYear:2022, avatarColor:'#4A3327', mobile:'9825044332' },
  { id:'S08', name:'Vikram Desai',    city:'Mumbai',    rating:4.3, ratingCount:53,  itemsSold:16, memberSinceYear:2023, avatarColor:'#464F49', mobile:'9833022110' },
  { id:'S09', name:'Isha Banerjee', city:'Kolkata',  rating:4.9, ratingCount:151, itemsSold:40, memberSinceYear:2022, avatarColor:'#2E2620', mobile:'9830055441' },
  { id:'S10', name:'Arjun Nair',      city:'Chennai',   rating:4.1, ratingCount:34,  itemsSold:11, memberSinceYear:2024, avatarColor:'#4E443B', mobile:'9840066778' },
  { id:'S11', name:'Neha Gupta',    city:'Jaipur',    rating:4.4, ratingCount:72,  itemsSold:21, memberSinceYear:2023, avatarColor:'#6E6156', mobile:'9829033445' },
  { id:'S12', name:'Rahul Verma',     city:'Lucknow',   rating:3.8, ratingCount:18,  itemsSold:4,  memberSinceYear:2025, avatarColor:'#3A3632', mobile:'9839077665' }
];

var SOLD_IDS = { 'RW-1018':1, 'RW-1022':1, 'RW-1033':1, 'RW-1038':1, 'RW-1049':1 };

var REASONS = ['Upgraded my wardrobe','Does not fit anymore','Barely worn, relocating cities','Bought the same piece twice','Style no longer suits me','Gifting surplus','Needed a smaller size'];
var FITS_BOTTOMS = ['Straight','Slim','Regular'];
var FITS_TOPS = ['Regular','Relaxed','Slim','Straight'];

var MINOR_FLAWS = [
  'Tiny pull on left sleeve (barely visible)',
  'Faint mark near hem, washed out',
  'Small loose thread on cuff',
  'Slight pilling under arms (washed)',
  'One button replaced with a matching one',
  'Minor fading on inner collar'
];
var FLAW_BY_IDX = { 8:0, 15:1, 22:2, 31:3, 40:4, 50:5 };

function condName(c){ return c === 'LN' ? 'Like New' : c === 'EX' ? 'Excellent' : 'Good'; }

function shapeFor(cat, sub, title){
  if (cat === 'Kids'){
    if (/kurta/i.test(title)) return 'kurta';
    if (/frock|dress/i.test(title)) return 'dress';
    if (/sherwani/i.test(title)) return 'suit';
    if (/lehenga/i.test(title)) return 'lehenga';
    if (/jacket/i.test(title)) return 'jacket';
    if (/dungaree|jean|pant/i.test(title)) return 'trousers';
    return 'kids';
  }
  if (cat === 'Accessories') return 'accessory';
  var m = CAT_TREE[cat] && CAT_TREE[cat].subs[sub];
  return m ? m.shape : 'top';
}

function buildMeasurements(cat, sub, size, rng, complete){
  var fields = (CAT_TREE[cat] && CAT_TREE[cat].subs[sub] && CAT_TREE[cat].subs[sub].measurements) || ['Size'];
  var out = {};
  if (!complete){
    out[fields[0]] = fields[0] === 'Size' ? 'Free' : String(80 + Math.floor(rng() * 20));
    return out;
  }
  for (var i = 0; i < fields.length; i++){
    var f = fields[i];
    if (f === 'Size'){
      out.Size = (size === 'Free') ? 'Free size' : ('Size ' + size);
    } else if (/Waist/.test(f)){
      var base = 64; if (/^\d+$/.test(size)) base = Math.round(parseInt(size, 10) * 2.54);
      out[f] = String(base + Math.floor(rng() * 6) - 2);
    } else if (/Collar/.test(f)){
      out[f] = /^\d+$/.test(size) ? size : String(38 + Math.floor(rng() * 6));
    } else if (/Chest/.test(f)){
      var letterMap = { S: 92, M: 100, L: 108, XL: 116 };
      var c = letterMap[size] || (/^\d+$/.test(size) ? parseInt(size, 10) + 60 : 100);
      out[f] = String(c + Math.floor(rng() * 8) - 4);
    } else if (/Length/.test(f)){
      out[f] = String(95 + Math.floor(rng() * 30));
    } else if (/Sleeve/.test(f)){
      out[f] = String(55 + Math.floor(rng() * 12));
    } else if (/Hip/.test(f)){
      out[f] = String(92 + Math.floor(rng() * 12));
    } else if (/Flare/.test(f)){
      out[f] = String(200 + Math.floor(rng() * 80));
    } else {
      out[f] = String(20 + Math.floor(rng() * 40));
    }
  }
  return out;
}

function buildDescription(title, brand, cond, worn, material, occasion, short){
  if (short){
    return 'Gently used ' + brand + ' ' + title + '. Freshly cleaned and ready to wear.';
  }
  var wornTxt = worn === 0 ? 'never worn' : (worn === 1 ? 'worn once' : 'worn ' + worn + ' times');
  var a = 'This ' + title + ' by ' + brand + ' is in ' + cond + ' condition and has been ' + wornTxt + '.';
  var b = 'Made of ' + material + ', it suits ' + occasion[0].toLowerCase() + ' occasions beautifully.';
  var c = 'Freshly washed and ready for its next home — measurements are listed below.';
  return a + ' ' + b + ' ' + c;
}

function buildProduct(row, idx){
  var p = row.split('|');
  var numId = p[0];
  var id = 'RW-' + numId;
  var title = p[1], brand = p[2], catSub = p[3], size = p[4], condC = p[5];
  var worn = parseInt(p[6], 10), tagged = p[7] === 'Y';
  var mrp = parseInt(p[8], 10), price = parseInt(p[9], 10);
  var color = p[10], material = p[11], occasion = p[12].split(','), sellerId = p[13];
  var catParts = catSub.split('>');
  var cat = catParts[0], sub = catParts[1];
  var rng = mulberry32(parseInt(numId, 10) * 7919 + 13);
  var seller = null;
  for (var s = 0; s < SELLERS.length; s++){ if (SELLERS[s].id === sellerId){ seller = SELLERS[s]; break; } }

  var tree = CAT_TREE[cat] && CAT_TREE[cat].subs[sub];
  var sizeType = tree ? tree.sizeType : 'letter';
  var lowMeas = (idx % 5) === 4;
  var shortDesc = !lowMeas && (idx % 8) === 3;
  var condition = condName(condC);
  var description = buildDescription(title, brand, condition, worn, material, occasion, shortDesc);
  var measurements = buildMeasurements(cat, sub, size, rng, !lowMeas);
  var flaws = (FLAW_BY_IDX[idx] !== undefined) ? MINOR_FLAWS[FLAW_BY_IDX[idx]] : 'None';
  var washed = !shortDesc;
  var measFilled = !lowMeas;
  var photoPts = 30;
  var measPts = measFilled ? 25 : 0;
  var flawsPts = flaws ? 15 : 0;
  var descPts = description.length >= 80 ? 15 : 0;
  var washedPts = washed ? 15 : 0;
  var listingScore = photoPts + measPts + flawsPts + descPts + washedPts;

  var listedAgoHours = Math.round((2 + rng() * (1440 - 2)) * 10) / 10;
  var isBottoms = /Bottoms|Belts/.test(sub);
  var fit = isBottoms ? FITS_BOTTOMS[Math.floor(rng() * FITS_BOTTOMS.length)] : FITS_TOPS[Math.floor(rng() * FITS_TOPS.length)];
  var keywords = (title + ' ' + brand + ' ' + cat + ' ' + sub + ' ' + material + ' ' + color + ' ' + occasion.join(' ') + ' ' + size)
    .toLowerCase().replace(/[^a-z0-9\s&]/g, ' ').split(/\s+/).filter(Boolean);

  return {
    id: id,
    title: title,
    brand: brand,
    category: cat,
    sub: sub,
    size: size,
    sizeType: sizeType,
    color: color,
    colorHex: COLOR_HEX[color] || '#8A8A8A',
    material: material,
    fit: fit,
    occasion: occasion,
    condition: condition,
    timesWorn: worn,
    tagsAttached: tagged,
    mrp: mrp,
    price: price,
    discountPct: Math.round((mrp - price) / mrp * 100),
    listingScore: listingScore,
    measurements: measurements,
    flaws: flaws,
    washed: washed,
    reasonForSelling: REASONS[Math.floor(rng() * REASONS.length)],
    description: description,
    images: ['rw-' + numId + '-a', 'rw-' + numId + '-b', 'rw-' + numId + '-c'],
    shape: shapeFor(cat, sub, title),
    sellerId: sellerId,
    city: seller ? seller.city : 'Pune',
    listedAgoHours: listedAgoHours,
    status: SOLD_IDS[id] ? 'sold' : 'available',
    viewsBase: 30 + Math.floor(rng() * 1500),
    wishlistBase: 1 + Math.floor(rng() * 60),
    keywords: keywords
  };
}

var PRODUCTS = [];
for (var i = 0; i < RAW.length; i++){ PRODUCTS.push(buildProduct(RAW[i], i)); }

/* ---- demo closet: 5 listings owned by "you", seeded into Manage on first run (core.js) ---- */
var MY_ROWS = [
  '1901|Pleated Midi Dress|Mango|Women>Dresses|M|EX|2|N|4499|1799|Black|Viscose|Party,City|S13',
  '1902|Slim Poplin Shirt|Uniqlo|Men>Shirts|40|EX|2|N|2999|1199|White|Cotton|Office,Casual|S13',
  '1903|Printed Cotton Frock|Gini & Jonny|Kids>Girls|6-7 yrs|Good|4|N|1899|799|Pink|Cotton|Party,Casual|S13',
  '1904|Tan Leather Satchel|Hidesign|Accessories>Bags|Free|LN|1|N|6999|2899|Tan|Leather|Office,Casual|S13',
  '1905|Wool-Blend Overcoat|Zara|Men>Outerwear|L|Good|5|N|7999|3200|Beige|Wool|Winter,Office|S13'
];
var MY_IDX = [1000, 1001, 1002, 1005, 1006];       /* %5!=4 and %8!=3 → full measurements + description */
var MY_VIEWS = [1284, 462, 96, 1503, 218];
var MY_HOURS = [6, 30, 96, 240, 720];
var MY_LISTINGS = [];
for (var m = 0; m < MY_ROWS.length; m++){
  var mp = buildProduct(MY_ROWS[m], MY_IDX[m]);
  mp.viewsBase = MY_VIEWS[m];
  mp.listedAgoHours = MY_HOURS[m];
  mp.listedAt = Date.now() - MY_HOURS[m] * 3600 * 1000;
  MY_LISTINGS.push(mp);
}
MY_LISTINGS[0].flaws = 'Tiny pull on left sleeve (barely visible)';
MY_LISTINGS[4].flaws = 'Minor fading on inner collar';
MY_LISTINGS[2].status = 'sold'; /* one demo already sold — Sold badge in Manage */
var MY_SELLERS = [
  { id:'S13', name:'You', city:'Pune', rating:4.7, ratingCount:12, itemsSold:5, memberSinceYear:2024, avatarColor:'#5C4033', mobile:'9000000001' }
];

/* ---- product photo config ----
   map: product id -> [front photo file]. Photos sit in the same folder as index.html (no subfolders).
   A product with no map entry, or whose photo fails to load, uses the generated SVG. Back/detail/tag views also use the SVG. */
var PHOTO_CFG = {
  /* category tile photos (home page); SVG shows if a file is missing */
  cats: { Women: 'cat-women.jpg', Men: 'cat-men.jpg', Kids: 'cat-kids.jpg', Accessories: 'cat-accessories.jpg' },
  map: {
  'RW-1001': ["multicolor_viscose_floral_wrap_dress.jpg"],
  'RW-1002': ["champagne_satin_slip_midi_dress.jpg"],
  'RW-1003': ["black_polyester_bodycon_party_dress.jpg"],
  'RW-1004': ["mustard_cotton_tiered_maxi_dress.jpg"],
  'RW-1005': ["maroon_crepe_cocktail_gown.jpg"],
  'RW-1006': ["silver_sequin_party_top.jpg"],
  'RW-1007': ["white_linen_shirt.jpg"],
  'RW-1008': ["peach_polyester_off_shoulder_ruffle_top.jpg"],
  'RW-1009': ["blue_cotton_printed_peplum_top.jpg"],
  'RW-1010': ["teal_cotton_printed_kurta_set.jpg"],
  'RW-1011': ["white_cotton_chikankari_straight_kurta.jpg"],
  'RW-1012': ["emerald_silk_anarkali_set.jpg"],
  'RW-1013': ["indigo_cotton_block_print_kurta.jpg"],
  'RW-1014': ["red_banarasi_silk_saree.jpg"],
  'RW-1015': ["pastel_green_chanderi_saree.jpg"],
  'RW-1016': ["wine_georgette_saree_with_sequin_border.jpg"],
  'RW-1017': ["rust_cotton_handloom_saree.jpg"],
  'RW-1018': ["teal_net_tulle_bridal_guest_lehenga.jpg"],
  'RW-1019': ["pink_georgette_sharara_set.jpg"],
  'RW-1020': ["blue_denim_high_rise_mom_jeans.jpg"],
  'RW-1021': ["beige_polyester_pleated_wide_leg_trousers.jpg"],
  'RW-1022': ["black_polyester_blend_tailored_blazer.jpg"],
  'RW-1023': ["blue_denim_jacket.jpg"],
  'RW-1024': ["black_faux_leather_biker_jacket.jpg"],
  'RW-1025': ["sky_blue_linen_shirt.jpg"],
  'RW-1026': ["white_cotton_formal_shirt.jpg"],
  'RW-1027': ["red_cotton_checked_casual_shirt.jpg"],
  'RW-1028': ["light_blue_cotton_oxford_button_down_shirt.jpg"],
  'RW-1029': ["black_cotton_abstract_geometric_print_t_shirt.jpg"],
  'RW-1030': ["navy_cotton_blend_polo_t_shirt.jpg"],
  'RW-1031': ["grey_polyester_moisture_wicking_training_tee.jpg"],
  'RW-1032': ["cream_brocade_wedding_sherwani.jpg"],
  'RW-1033': ["maroon_silk_kurta_pyjama_set.jpg"],
  'RW-1034': ["navy_wool_blend_nehru_jacket.jpg"],
  'RW-1035': ["dark_blue_denim_slim_fit_jeans.jpg"],
  'RW-1036': ["khaki_cotton_chinos.jpg"],
  'RW-1037': ["charcoal_poly_viscose_formal_trousers.jpg"],
  'RW-1038': ["navy_wool_blend_two_piece_suit.jpg"],
  'RW-1039': ["black_wool_blend_tuxedo_jacket.jpg"],
  'RW-1040': ["beige_linen_blend_casual_blazer.jpg"],
  'RW-1041': ["charcoal_wool_overcoat.jpg"],
  'RW-1042': ["grey_fleece_zip_hoodie.jpg"],
  'RW-1043': ["olive_nylon_puffer_jacket.jpg"],
  'RW-1044': ["black_nylon_bomber_jacket.jpg"],
  'RW-1045': ["mustard_cotton_child_size_kurta_set.jpg"],
  'RW-1046': ["pink_net_tulle_child_size_girls_party_frock.jpg"],
  'RW-1047': ["ivory_brocade_child_size_boys_sherwani_set.jpg"],
  'RW-1048': ["blue_child_size_denim_dungaree.jpg"],
  'RW-1049': ["orange_silk_blend_child_size_girls_lehenga_choli.jpg"],
  'RW-1050': ["red_nylon_child_size_winter_jacket.jpg"],
  'RW-1051': ["beige_pashmina_stole.jpg"],
  'RW-1052': ["tan_leather_belt.jpg"],
  'RW-1053': ["set_of_three_assorted_color_silk_ties.jpg"],
  'RW-1054': ["gold_embroidered_clutch.jpg"],
  'RW-1055': ["grey_woollen_muffler.jpg"],
  'RW-1056': ["multicolor_silk_bandhani_dupatta.jpg"],
  'RW-1057': ["beige_linen_shirt_dress.jpg"],
  'RW-1058': ["coral_cotton_fit_and_flare_dress.jpg"],
  'RW-1059': ["wine_velvet_wrap_party_dress.jpg"],
  'RW-1060': ["blue_cotton_printed_shirt_dress.jpg"],
  'RW-1061': ["white_cotton_ruffle_sleeve_blouse.jpg"],
  'RW-1062': ["champagne_satin_bow_neck_blouse.jpg"],
  'RW-1063': ["olive_cotton_blend_knit_crewneck_top.jpg"],
  'RW-1064': ["red_striped_cotton_top.jpg"],
  'RW-1065': ["indigo_ikat_cotton_kurta.jpg"],
  'RW-1066': ["mustard_cotton_angrakha_style_kurta.jpg"],
  'RW-1067': ["pastel_green_cotton_kota_doria_kurta.jpg"],
  'RW-1068': ["silver_organza_party_saree.jpg"],
  'RW-1069': ["rust_cotton_kalamkari_handloom_saree.jpg"],
  'RW-1070': ["teal_sequin_georgette_saree.jpg"],
  'RW-1071': ["maroon_velvet_embroidered_lehenga.jpg"],
  'RW-1072': ["pink_georgette_floral_print_sharara_set.jpg"],
  'RW-1073': ["cream_viscose_high_waist_palazzo_trousers.jpg"],
  'RW-1074': ["khaki_cotton_straight_fit_culottes.jpg"],
  'RW-1075': ["charcoal_nylon_quilted_puffer_vest.jpg"],
  'RW-1076': ["sky_blue_cropped_denim_jacket.jpg"],
  'RW-1077': ["olive_linen_cuban_collar_shirt.jpg"],
  'RW-1078': ["rust_cotton_flannel_check_shirt.jpg"],
  'RW-1079': ["light_blue_cotton_striped_formal_shirt.jpg"],
  'RW-1080': ["cream_linen_resort_shirt.jpg"],
  'RW-1081': ["navy_cotton_solid_crew_tee.jpg"],
  'RW-1082': ["black_polyester_running_moisture_wicking_tee.jpg"],
  'RW-1083': ["grey_cotton_blend_raglan_sleeve_tee.jpg"],
  'RW-1084': ["mustard_cotton_printed_oversized_tee.jpg"],
  'RW-1085': ["white_cotton_chikankari_kurta.jpg"],
  'RW-1086': ["orange_cotton_bandhani_print_kurta.jpg"],
  'RW-1087': ["gold_silk_nehru_jacket.jpg"],
  'RW-1088': ["grey_fleece_tapered_joggers.jpg"],
  'RW-1089': ["navy_cotton_stretch_chinos.jpg"],
  'RW-1090': ["dark_blue_denim_distressed_slim_jeans.jpg"],
  'RW-1091': ["charcoal_wool_blend_windowpane_suit.jpg"],
  'RW-1092': ["navy_linen_blazer.jpg"],
  'RW-1093': ["red_polyester_blend_checkered_waistcoat.jpg"],
  'RW-1094': ["navy_wool_blend_peacoat.jpg"],
  'RW-1095': ["olive_fleece_quarter_zip.jpg"],
  'RW-1096': ["charcoal_nylon_quilted_liner_jacket.jpg"],
  'RW-1097': ["sky_blue_child_size_boys_cotton_kurta_set.jpg"],
  'RW-1098': ["olive_cotton_child_size_dino_print_t_shirt.jpg"],
  'RW-1099': ["khaki_cotton_child_size_boys_chino_shorts.jpg"],
  'RW-1100': ["ivory_polyester_blend_child_size_boys_party_waistcoat_set.jpg"],
  'RW-1101': ["light_blue_cotton_child_size_printed_night_suit.jpg"],
  'RW-1102': ["blue_child_size_boys_denim_overshirt.jpg"],
  'RW-1103': ["navy_polyester_child_size_sports_track_pants.jpg"],
  'RW-1104': ["white_child_size_boys_linen_shirt.jpg"],
  'RW-1105': ["grey_child_size_winter_fleece_hoodie.jpg"],
  'RW-1106': ["indigo_denim_child_size_boys_cotton_dungaree.jpg"],
  'RW-1107': ["pink_child_size_girls_tutu_tulle_skirt.jpg"],
  'RW-1108': ["peach_cotton_child_size_floral_summer_frock.jpg"],
  'RW-1109': ["pink_silk_blend_child_size_sequin_girls_lehenga.jpg"],
  'RW-1110': ["multicolor_cotton_child_size_printed_leggings_set.jpg"],
  'RW-1111': ["red_net_tulle_child_size_girls_party_frock.jpg"],
  'RW-1112': ["blue_child_size_denim_skirt.jpg"],
  'RW-1113': ["mustard_child_size_girls_cotton_kurta.jpg"],
  'RW-1114': ["champagne_child_size_satin_bow_dress.jpg"],
  'RW-1115': ["maroon_nylon_child_size_winter_puffer.jpg"],
  'RW-1116': ["sky_blue_child_size_twirl_cotton_dress.jpg"],
  'RW-1117': ["beige_straw_beach_tote.jpg"],
  'RW-1118': ["black_faux_leather_quilted_sling_bag.jpg"],
  'RW-1119': ["set_of_two_assorted_color_silk_pocket_squares.jpg"],
  'RW-1120': ["mustard_wool_knit_tie.jpg"],
  'RW-1121': ["black_studded_leather_belt.jpg"],
  'RW-1122': ["tan_leather_weave_ratchet_belt.jpg"],
  'RW-1123': ["teal_cotton_block_print_stole.jpg"],
  'RW-1124': ["red_wool_plaid_scarf.jpg"],
  'RW-1125': ["multicolor_silk_phulkari_dupatta.jpg"],
  'RW-1126': ["peach_georgette_chiffon_ruffle_dupatta.jpg"]
} };

/* ---- config ---- */
var CONFIG = {
  deliveryFreeAbove: 999,
  deliveryFee: 49,
  platformFee: 5,
  codFee: 25,
  sellerFeePct: 8,
  cartMax: 10,
  priceMin: 99,
  photosMax: 3,
  pinAttempts: 3,
  lockoutMs: 30000,
  holdMs: 10 * 60 * 1000,
  upiWindowMs: 5 * 60 * 1000,
  returnWindowDays: 3,
  coupons: {
    'REVOGUE10': { code:'REVOGUE10', type:'pct', pct:10, cap:150, min:799, label:'10% off up to ₹150 (min ₹799)' },
    'FIRST100': { code:'FIRST100', type:'flat', amount:100, min:699, firstOrderOnly:true, label:'₹100 off first order (min ₹699)' },
    'FREESHIP': { code:'FREESHIP', type:'freeship', min:0, label:'Free delivery (when delivery would otherwise apply)' }
  },
  sorts: ['relevance','newest','price_low','price_high','discount','popularity','least_worn'],
  perPageOptions: [12,24,48],
  etaMetroDays: [2,4],
  etaOtherDays: [4,7]
};

var COLLECTIONS = {
  'Ethnic': /ethnic|festive|wedding|puja|kurta|saree|lehenga|sherwani|anarkali|dupatta|sharara|bandhani|chikankari|banarasi|pashmina/i,
  'Party Wear': /party|date|birthday/i,
  'Winter': /winter/i,
  'Wedding': /wedding/i,
  'Office': /office/i
};

var SYNONYMS = {
  'kurti':'kurta','tee':'t-shirt','tshirt':'t-shirt','frock':'dress','sari':'saree',
  'coat':'jacket','overcoat':'jacket','lehnga':'lehenga','jeans':'denim','tux':'tuxedo'
};

var BRAND_ALIASES = {
  'm&s':'Marks & Spencer','mns':'Marks & Spencer','marks and spencer':'Marks & Spencer',
  'us polo':'U.S. Polo Assn.','uspolo':'U.S. Polo Assn.','u.s. polo':'U.S. Polo Assn.',
  'levi':'Levi\'s','levis':'Levi\'s','tnf':'The North Face','north face':'The North Face'
};

/* ---- seeded orders (§10): one per status, pinned ---- */
function seedOrder(cfg){
  var prod = null;
  for (var j = 0; j < PRODUCTS.length; j++){ if (PRODUCTS[j].id === cfg.productId){ prod = PRODUCTS[j]; break; } }
  var seller = null;
  for (var k = 0; k < SELLERS.length; k++){ if (SELLERS[k].id === prod.sellerId){ seller = SELLERS[k]; k = SELLERS.length; } }
  var subtotal = prod.price;
  var delivery = subtotal >= CONFIG.deliveryFreeAbove ? 0 : CONFIG.deliveryFee;
  return {
    orderId: cfg.orderId,
    seeded: true,
    pinnedStatus: cfg.status,
    createdAt: Date.now() - cfg.hoursAgo * 3600 * 1000,
    items: [{
      id: prod.id, title: prod.title, brand: prod.brand, price: prod.price, mrp: prod.mrp,
      size: prod.size, sellerId: prod.sellerId, sellerName: seller ? seller.name : 'Seller',
      colorHex: prod.colorHex, shape: prod.shape, image: prod.images[0], condition: prod.condition
    }],
    buyer: {
      name: cfg.buyerName, mobile: cfg.mobile, email: cfg.buyerName.toLowerCase().replace(/\s+/g,'.') + '@example.com',
      address: { house:'221B Demo Lane', area:'Market Road', pincode: cfg.pincode, city: cfg.city, state: cfg.state, tag:'Home' }
    },
    payment: { method: cfg.method, status: cfg.payStatus, upiId: cfg.upiId || null },
    totals: { subtotal: subtotal, couponDiscount: 0, delivery: delivery, platformFee: CONFIG.platformFee, codFee: cfg.method === 'COD' && cfg.status !== 'PAYMENT_PENDING' ? CONFIG.codFee : 0, total: subtotal + delivery + CONFIG.platformFee + (cfg.method === 'COD' ? CONFIG.codFee : 0) },
    coupon: null,
    status: cfg.status,
    pinnedTimeline: cfg.timeline,
    timeline: [],
    rating: cfg.rating || null,
    returnRequest: null
  };
}

var SEED_ORDERS = [
  seedOrder({ orderId:'ORD-5001', productId:'RW-1001', status:'PLACED', method:'COD', payStatus:'PAID', hoursAgo:14,
    buyerName:'Asha Kapoor', mobile:'9812345670', pincode:'411001', city:'Pune', state:'Maharashtra',
    timeline:[{stage:'PLACED', agoHours:14}] }),
  seedOrder({ orderId:'ORD-5002', productId:'RW-1025', status:'CONFIRMED', method:'UPI', payStatus:'PAID', upiId:'demo@upi', hoursAgo:40,
    buyerName:'Bunty Singh', mobile:'9822345671', pincode:'400001', city:'Mumbai', state:'Maharashtra',
    timeline:[{stage:'PLACED', agoHours:40},{stage:'CONFIRMED', agoHours:30}] }),
  seedOrder({ orderId:'ORD-5003', productId:'RW-1045', status:'SHIPPED', method:'COD', payStatus:'PAID', hoursAgo:96,
    buyerName:'Chetna Rao', mobile:'9845345672', pincode:'560001', city:'Bengaluru', state:'Karnataka',
    timeline:[{stage:'PLACED', agoHours:96},{stage:'CONFIRMED', agoHours:88},{stage:'PACKED', agoHours:70},{stage:'SHIPPED', agoHours:20}] }),
  seedOrder({ orderId:'ORD-5004', productId:'RW-1030', status:'OUT_FOR_DELIVERY', method:'UPI', payStatus:'PAID', upiId:'demo2@upi', hoursAgo:120,
    buyerName:'Dev Patel', mobile:'9811345673', pincode:'110001', city:'Delhi', state:'Delhi',
    timeline:[{stage:'PLACED', agoHours:120},{stage:'CONFIRMED', agoHours:110},{stage:'PACKED', agoHours:90},{stage:'SHIPPED', agoHours:60},{stage:'OUT_FOR_DELIVERY', agoHours:5}] }),
  seedOrder({ orderId:'ORD-5005', productId:'RW-1011', status:'DELIVERED', method:'COD', payStatus:'PAID', hoursAgo:240,
    buyerName:'Esha Iyer', mobile:'9849345674', pincode:'600001', city:'Chennai', state:'Tamil Nadu', rating:{ stars:5, comment:'Lovely kurta, exactly as described!' },
    timeline:[{stage:'PLACED', agoHours:240},{stage:'CONFIRMED', agoHours:230},{stage:'PACKED', agoHours:210},{stage:'SHIPPED', agoHours:180},{stage:'OUT_FOR_DELIVERY', agoHours:96},{stage:'DELIVERED', agoHours:90}] }),
  seedOrder({ orderId:'ORD-5006', productId:'RW-1029', status:'CANCELLED', method:'COD', payStatus:'PAID', hoursAgo:300,
    buyerName:'Farhan Ali', mobile:'9830345675', pincode:'700001', city:'Kolkata', state:'West Bengal',
    timeline:[{stage:'PLACED', agoHours:300},{stage:'CANCELLED', agoHours:280}] })
];

/* ---- misc seeds ---- */
var TESTIMONIALS = [
  { name:'Kavya M.',   city:'Pune',      stars:5, text:'Found a barely-worn Zara dress for a third of the price. Measurements were spot on!' },
  { name:'Siddharth R.',city:'Mumbai',  stars:5, text:'Sold three shirts in a week. The listing dashboard is simple and the slip is handy.' },
  { name:'Nandini S.', city:'Bengaluru', stars:4, text:'Love the trust signals — condition grade and flaws disclosure made me confident.' },
  { name:'Rahul K.',   city:'Delhi',     stars:5, text:'UPI checkout with retry worked smoothly. Track timeline is clear and honest.' },
  { name:'Meenal P.',  city:'Jaipur',    stars:4, text:'Great ethnic section. The Chikankari kurta looked exactly like the photos.' },
  { name:'Arav T.',    city:'Chennai',   stars:5, text:'Bought a winter jacket before a trip. Free delivery above ₹999 sealed the deal.' }
];

var FAQS = [
  { q:'What is ReVogue?', a:'ReVogue is a student-project marketplace to buy and sell lightly used clothes. Every listing is one of a kind.' },
  { q:'Is this a real shop?', a:'No. It is a browser-only demo: no real payments, shipping, SMS or email happen. Data stays in your browser storage.' },
  { q:'How do I buy an item?', a:'Browse or search, open a product, add to cart, and complete checkout with COD or the simulated UPI screen.' },
  { q:'What payment methods work?', a:'Cash on Delivery (₹25 handling) and a simulated UPI flow with demo success/failure controls.' },
  { q:'Is payment taken for real?', a:'Never. Cards, UPI and bank details are not collected; the UPI screen is a mock for the demo.' },
  { q:'How do returns work?', a:'Request a return within 3 days of delivery for "not as described" issues only. Hygiene items are non-returnable.' },
  { q:'How do I sell an item?', a:'Tap Sell, complete the 7-step wizard (photos, measurements, price), and your listing goes live instantly.' },
  { q:'How do I manage my listings?', a:'Open Manage listing to see everything you have listed - edit details, drop the price, mark sold or delete. No PIN needed.' },
  { q:'How do I track my order?', a:'Open Track to see every order you have placed with its live status - Placed, Confirmed, Shipped, Delivered and more.' },
  { q:'What does "Complete listing" mean?', a:'It is a quality score (photos, measurements, flaws, description, wash declaration) — not an inspection by ReVogue.' },
  { q:'What do the condition grades mean?', a:'Like New: barely used (≤2 wears). Excellent: ≤3 wears. Good: 3–6 wears with minor, disclosed flaws.' },
  { q:'Why is quantity always 1?', a:'Every item is second-hand and unique, so once it sells it is gone. Carts and holds protect you from races.' },
  { q:'How does the hold timer work?', a:'Starting checkout reserves your items for 10 minutes. UPI orders get a 5-minute payment window.' },
  { q:'Can I track my order?', a:'Yes — go to Track and enter your Order ID plus the last 4 digits of your mobile.' },
  { q:'Where is my data stored?', a:'In this browser only (localStorage). "Reset demo data" clears it and restores the seeds.' }
];

var PINCODES = {
  '411': { city:'Pune', state:'Maharashtra' },
  '400': { city:'Mumbai', state:'Maharashtra' },
  '560': { city:'Bengaluru', state:'Karnataka' },
  '500': { city:'Hyderabad', state:'Telangana' },
  '110': { city:'Delhi', state:'Delhi' },
  '380': { city:'Ahmedabad', state:'Gujarat' },
  '700': { city:'Kolkata', state:'West Bengal' },
  '600': { city:'Chennai', state:'Tamil Nadu' },
  '302': { city:'Jaipur', state:'Rajasthan' },
  '226': { city:'Lucknow', state:'Uttar Pradesh' }
};

var PIN_REGIONS = {
  '1': { city:'North India', state:'India' }, '2': { city:'North India', state:'India' },
  '3': { city:'West India', state:'India' }, '4': { city:'West India', state:'India' },
  '5': { city:'South India', state:'India' }, '6': { city:'South India', state:'India' },
  '7': { city:'East India', state:'India' }, '8': { city:'East India', state:'India' },
  '9': null
};

window.RW_DATA = {
  products: PRODUCTS,
  sellers: SELLERS,
  myListings: MY_LISTINGS,
  mySellers: MY_SELLERS,
  orders: SEED_ORDERS,
  config: CONFIG,
  photoCfg: PHOTO_CFG,
  categoryTree: CAT_TREE,
  collections: COLLECTIONS,
  synonyms: SYNONYMS,
  brandAliases: BRAND_ALIASES,
  testimonials: TESTIMONIALS,
  faqs: FAQS,
  pincodes: PINCODES,
  pinRegions: PIN_REGIONS
};
})();
