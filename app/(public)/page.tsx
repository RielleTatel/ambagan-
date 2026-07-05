import { Navbar } from '@/components/landing/Navbar'
import { HeroSection } from '@/components/landing/HeroSection'
import { CommunitySection } from '@/components/landing/CommunitySection'
import { ProblemSection } from '@/components/landing/ProblemSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { SavingsFlowDiagram } from '@/components/landing/SavingsFlowDiagram'
import { TrustSection } from '@/components/landing/TrustSection'
import { FAQSection } from '@/components/landing/FAQSection'
import { CTASection } from '@/components/landing/CTASection'
import { Footer } from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-warm-bg">
      <Navbar />
      <main>
        <HeroSection />
        <CommunitySection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SavingsFlowDiagram />
        <TrustSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
