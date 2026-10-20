import { ImageResponse } from 'next/og';
export const alt='LEEK — Koos kasvab Loode-Eesti';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{width:'100%',height:'100%',background:'#f8f7f3',color:'#152521',display:'flex',flexDirection:'column',padding:75,justifyContent:'space-between'}}><div style={{display:'flex',fontSize:48,fontWeight:700,color:'#ec5b25'}}>LEEK</div><div style={{display:'flex',fontSize:86,fontWeight:700,lineHeight:1.1,letterSpacing:-4}}>Koos kasvab<br/>Loode-Eesti.</div><div style={{display:'flex',fontSize:24,color:'#204e3c'}}>Kohalikud ettevõtted. Suured võimalused.</div></div>,size);}
