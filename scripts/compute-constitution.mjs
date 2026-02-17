#!/usr/bin/env node
/**
 * Constitution computation script
 * Ports the core saju.ts logic to compute constitution codes
 * T=taeyang, E=taeeum, S=soyang, U=soeum
 */

const STEM_EL = [0,0,1,1,2,2,3,3,4,4] // 목=0,화=1,토=2,금=3,수=4
const BRANCH_EL = [4,2,0,0,2,1,1,2,3,3,2,4]
const SOLAR = [[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,8],[9,8],[10,8],[11,7],[12,7],[1,5]]
const MSO = [2,4,6,8,0]
const HSO = [0,2,4,6,8]

function jdn(y,m,d) {
  const a = Math.floor((14-m)/12)
  const Y = y+4800-a
  const M = m+12*a-3
  return d+Math.floor((153*M+2)/5)+365*Y+Math.floor(Y/4)-Math.floor(Y/100)+Math.floor(Y/400)-32045
}

export function cc(bd, bh=null) {
  const [y,m,d] = bd.split('-').map(Number)
  const ay = (m<2||(m===2&&d<4)) ? y-1 : y
  const ys = ((ay%10)+6)%10
  const yb = ((ay%12)+8)%12

  let sm=0
  for(let i=0;i<12;i++){
    const [a,b]=SOLAR[i]
    const ni=(i+1)%12
    const [c,e]=SOLAR[ni]
    if(a<=c){if((m>a||(m===a&&d>=b))&&(m<c||(m===c&&d<e))){sm=i;break}}
    else{if((m>a||(m===a&&d>=b))||(m<c||(m===c&&d<e))){sm=i;break}}
  }

  const mb = (sm+2)%12
  const ms = (MSO[ys%5]+sm)%10
  const di = ((jdn(y,m,d)+9)%60+60)%60
  const ds = di%10
  const db = di%12

  const bal = [0,0,0,0,0]
  const add = (s,b,w) => { bal[STEM_EL[s]]+=w; bal[BRANCH_EL[b]]+=w }
  add(ys,yb,1.0); add(ms,mb,1.2); add(ds,db,1.5)
  if(bh!=null){
    const hb=Math.floor(((bh+1)%24)/2)
    const hs=(HSO[ds%5]+hb)%10
    add(hs,hb,1.0)
  }

  const t=bal.reduce((a,b)=>a+b,0)
  const n=bal.map(v=>Math.round(v/t*100))
  const s=n.reduce((a,b)=>a+b,0)
  if(s!==100){const mi=n.indexOf(Math.max(...n));n[mi]+=100-s}

  const [木,火,土,金,水]=n
  const sc={
    T:火*1.5+木*1.0-水*0.5,
    S:火*1.0+土*1.2-金*0.3+木*0.5,
    E:土*1.5+金*1.0-木*0.3+水*0.3,
    U:水*1.5+金*1.0-火*0.5,
  }
  return Object.entries(sc).sort(([,a],[,b])=>b-a)[0][0]
}

// All existing celebrities from celebrities.ts
const existing = [
  ['bts-rm','1994-09-12'],['bts-jin','1992-12-04'],['bts-suga','1993-03-09'],
  ['bts-jhope','1994-02-18'],['bts-jimin','1995-10-13'],['bts-v','1995-12-30'],
  ['bts-jk','1997-09-01'],['bp-jisoo','1995-01-03'],['bp-jennie','1996-01-16'],
  ['bp-rose','1997-02-11'],['bp-lisa','1997-03-27'],['nj-minji','2004-05-07'],
  ['nj-hanni','2004-10-06'],['nj-danielle','2005-04-11'],['nj-haerin','2006-05-15'],
  ['nj-hyein','2008-04-21'],['ae-karina','2000-04-11'],['ae-giselle','2000-10-30'],
  ['ae-winter','2001-01-01'],['ae-ningning','2002-10-23'],['ive-yujin','2003-09-01'],
  ['ive-gaeul','2002-09-24'],['ive-rei','2004-02-03'],['ive-wonyoung','2004-08-31'],
  ['ive-liz','2004-11-21'],['ive-leeseo','2007-02-21'],['lsf-sakura','1998-03-19'],
  ['lsf-chaewon','2000-08-01'],['lsf-yunjin','2001-10-08'],['lsf-kazuha','2003-08-09'],
  ['lsf-eunchae','2006-11-10'],['tw-nayeon','1995-09-22'],['tw-jeongyeon','1996-11-01'],
  ['tw-momo','1996-11-09'],['tw-sana','1996-12-29'],['tw-jihyo','1997-02-01'],
  ['tw-mina','1997-03-24'],['tw-dahyun','1998-05-28'],['tw-chaeyoung','1999-04-23'],
  ['tw-tzuyu','1999-06-14'],['skz-bangchan','1997-10-03'],['skz-leeknow','1998-10-25'],
  ['skz-changbin','1999-08-11'],['skz-hyunjin','2000-03-20'],['skz-han','2000-09-14'],
  ['skz-felix','2000-09-15'],['skz-seungmin','2000-09-22'],['skz-in','2001-02-08'],
  ['svt-scoups','1995-08-08'],['svt-jeonghan','1995-10-04'],['svt-hoshi','1996-06-15'],
  ['svt-woozi','1996-11-22'],['svt-mingyu','1997-04-06'],['svt-vernon','1998-02-18'],
  ['svt-dino','1999-02-11'],['exo-xiumin','1990-03-26'],['exo-baekhyun','1992-05-06'],
  ['exo-chanyeol','1992-11-27'],['exo-do','1993-01-12'],['exo-kai','1994-01-14'],
  ['exo-sehun','1994-04-12'],['txt-soobin','2000-12-05'],['txt-yeonjun','1999-09-13'],
  ['txt-beomgyu','2001-03-13'],['txt-taehyun','2002-02-05'],['txt-hueningkai','2002-08-14'],
  ['en-jungwon','2004-02-09'],['en-heeseung','2001-10-15'],['en-jay','2002-04-20'],
  ['en-jake','2002-11-15'],['en-sunghoon','2002-12-08'],['en-sunoo','2003-06-24'],
  ['en-niki','2005-12-09'],['itzy-yeji','2000-05-26'],['itzy-lia','2000-07-21'],
  ['itzy-ryujin','2001-04-17'],['itzy-chaeryeong','2001-06-05'],['itzy-yuna','2003-12-09'],
  ['idle-miyeon','1997-01-31'],['idle-minnie','1997-10-23'],['idle-soyeon','1998-08-26'],
  ['idle-yuqi','1999-09-23'],['idle-shuhua','2000-01-06'],['rv-irene','1991-03-29'],
  ['rv-seulgi','1994-02-10'],['rv-wendy','1994-02-21'],['rv-joy','1996-09-03'],
  ['rv-yeri','1999-03-05'],['iu','1993-05-16'],['taeyeon','1989-03-09'],
  ['gdragon','1988-08-18'],['psy','1977-12-31'],['zico','1992-09-14'],
  ['atz-hongjoong','1998-11-07'],['atz-seonghwa','1998-04-03'],['atz-san','1999-07-10'],
  ['atz-wooyoung','1999-11-26'],['tr-hyunsuk','1999-04-21'],['tr-jihoon','2000-03-14'],
  ['tr-junkyu','2000-09-09'],['nmixx-haewon','2003-04-28'],['nmixx-sullyoon','2004-01-26'],
  ['illit-yunah','2005-03-19'],['illit-minju','2005-10-22'],['illit-wonhee','2007-05-14'],
  ['act-hyunbin','1982-09-25'],['act-sonjejin','1982-01-11'],['act-jeonjihyeon','1981-10-30'],
  ['act-madongseok','1971-03-01'],['act-gongyoo','1979-07-10'],['act-kimsoohyun','1988-02-16'],
  ['act-leejongsuk','1989-09-14'],['act-parkseojooon','1988-12-16'],['act-songjoongki','1985-09-19'],
  ['act-leeminho','1987-06-22'],['act-baesuzy','1994-10-10'],['act-kimsaeron','1990-04-24'],
  ['act-parkeunbin','1992-09-04'],['act-hansoohee','1994-11-18'],['act-songkangho','1967-01-17'],
  ['act-leebyunghun','1970-07-12'],['act-junghaein','1988-04-01'],['act-limjiyeon','1990-07-23'],
  ['act-songsongkang','1994-04-23'],['act-parkbogum','1993-06-16'],['act-kimyoojung','1999-09-22'],
  ['act-chunwoohee','1987-04-20'],['act-leejungjae','1972-12-15'],
  ['ath-sonheungmin','1992-07-08'],['ath-kimyeona','1990-09-05'],['ath-ryu','1987-03-25'],
  ['ath-parkjisung','1981-02-25'],['ath-chuson','1982-07-13'],['ath-ansanwon','2002-02-17'],
  ['ath-hwangdaeheon','1999-05-01'],['ath-kiminsu','1989-10-01'],['ath-ohsehuk','1994-01-01'],
  ['ath-choihyunji','1988-11-08'],['ath-leeganginn','2001-02-19'],['ath-kimminjaee','1996-11-15'],
  ['gl-taylor','1989-12-13'],['gl-musk','1971-06-28'],['gl-lebron','1984-12-30'],
  ['gl-messi','1987-06-24'],['gl-ronaldo','1985-02-05'],['gl-billie','2001-12-18'],
  ['gl-olivia','2003-02-20'],['gl-zendaya','1996-09-01'],['gl-timchalamet','1995-12-27'],
  ['gl-margot','1990-07-02'],['gl-ohtani','1994-07-05'],['gl-drake','1986-10-24'],
  ['gl-ariana','1993-06-26'],['gl-bts-collab','1991-12-02'],['gl-adele','1988-05-05'],
  ['gl-rihanna','1988-02-20'],
  ['hist-sejong','1397-05-15'],['hist-leesunsin','1545-04-28'],['hist-yigwangsu','1892-03-04'],
  ['hist-yusinna','1902-12-16'],['hist-jangbogo','0790-01-01'],['hist-hwangjini','1506-01-01'],
  ['hist-jeongjo','1752-10-28'],['hist-sinsa','1504-01-01'],['hist-gwanggg','0374-01-01'],
  ['hist-danjong','1441-08-09'],['hist-heonjong','1539-01-01'],['hist-napoleon','1769-08-15'],
  ['hist-einstein','1879-03-14'],['hist-leonardo','1452-04-15'],['hist-cleopatra','-0069-01-01'],
  ['ani-naruto','1988-10-10'],['ani-sasuke','1988-07-23'],['ani-sakura','1988-03-28'],
  ['ani-kakashi','1976-09-15'],['ani-luffy','1985-05-05'],['ani-zoro','1985-11-11'],
  ['ani-nami','1986-07-03'],['ani-sanji','1986-03-02'],['ani-tanjiro','1900-07-14'],
  ['ani-nezuko','1901-12-28'],['ani-rengoku','1898-05-10'],['ani-goku','1984-04-16'],
  ['ani-vegeta','1984-08-01'],['ani-gojo','1989-12-07'],['ani-itadori','2003-03-20'],
  ['ani-levi','1983-12-25'],['ani-eren','2000-03-30'],['ani-mikasa','2000-02-10'],
  ['ani-deku','2000-07-15'],['ani-bakugo','2000-04-20'],['ani-todoroki','2000-01-11'],
  ['ani-spike','1972-06-26'],['ani-light','1986-02-28'],['ani-conan','1985-05-04'],
  ['ani-anya','2014-10-02'],
  ['dr-giseong','1972-12-15'],['dr-saebyeok','1994-06-04'],['dr-dongwook','1993-01-31'],
  ['dr-moondong','1990-01-30'],['dr-vincenzo','1985-09-19'],['dr-goblin','1979-07-10'],
  ['dr-domin','1981-10-30'],['dr-itsokay-gang','1988-02-16'],['dr-baekyi','1988-02-16'],
  ['dr-hqw','1990-03-28'],['dr-jangukiyong','1992-08-07'],['dr-yeommi','1990-04-24'],
  ['dr-saeroyi','1988-12-16'],['dr-wooyoung','1992-09-04'],
]

// Output constitution codes
console.log('// Constitution codes for existing celebrities')
console.log('// Format: id → code (T=taeyang, E=taeeum, S=soyang, U=soeum)')
console.log('')

const codeMap = {}
for (const [id, bd] of existing) {
  const code = cc(bd)
  codeMap[id] = code
}

// Output as JSON for easy consumption
console.log(JSON.stringify(codeMap, null, 2))
