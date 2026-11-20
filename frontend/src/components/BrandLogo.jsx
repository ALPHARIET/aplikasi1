// Lambang resmi Universitas Bengkulu, sumber: https://www.unib.ac.id/profil/lambang/
// (dipotong rapat ke tepi lambang, 252x256 px)
import logoUnib from '../assets/logo_unib.png';

export default function BrandLogo({ className = 'h-10 w-auto object-contain', alt = 'Universitas Bengkulu' }) {
  return <img src={logoUnib} alt={alt} className={className} />;
}
