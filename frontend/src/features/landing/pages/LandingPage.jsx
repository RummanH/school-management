import LandingHeader from '../components/LandingHeader.jsx';
import HeroSection from '../components/HeroSection.jsx';
import AboutSection from '../components/AboutSection.jsx';
import StatsSection from '../components/StatsSection.jsx';
import NoticeSection from '../components/NoticeSection.jsx';
import AcademicsSection from '../components/AcademicsSection.jsx';
import AdmissionSection from '../components/AdmissionSection.jsx';
import GallerySection from '../components/GallerySection.jsx';
import ContactSection from '../components/ContactSection.jsx';
import LandingFooter from '../components/LandingFooter.jsx';

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <LandingHeader />
      <HeroSection />
      <AboutSection />
      <StatsSection />
      <NoticeSection />
      <AcademicsSection />
      <AdmissionSection />
      <GallerySection />
      <ContactSection />
      <LandingFooter />
    </div>
  );
}
