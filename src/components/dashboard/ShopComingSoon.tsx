'use client'

import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { ShoppingBag, Sparkles, Coins, Zap, Star } from 'lucide-react'

interface ShopComingSoonProps {
  username?: string
}

export function ShopComingSoon({ username }: ShopComingSoonProps) {
  return (
    <div className="min-h-[100dvh] min-h-screen bg-midnight-violet flex flex-col">
      {/* Header */}
      <Header username={username} />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-5 pb-20 sm:pb-24 py-8 sm:py-12 overflow-x-hidden flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6 sm:gap-8">
          {/* Animated Main Icon Container */}
          <div className="relative flex items-center justify-center mb-4">
            {/* Glowing Background Circle */}
            <div className="absolute w-48 h-48 sm:w-64 sm:h-64 bg-lime-yellow/20 rounded-full blur-3xl animate-pulse" />
            
            {/* Main Shopping Bag Icon with Pulsing Animation */}
            <div className="relative z-10">
              <ShoppingBag 
                className="w-32 h-32 sm:w-40 sm:h-40 text-lime-yellow animate-bounce"
                style={{
                  animation: 'float 3s ease-in-out infinite, pulse 2s ease-in-out infinite'
                }}
              />
            </div>

            {/* Floating Sparkles around the icon */}
            <Sparkles 
              className="absolute -top-4 -left-4 w-8 h-8 text-lime-yellow/80 animate-spin"
              style={{ animationDuration: '3s', animationDelay: '0s' }}
            />
            <Sparkles 
              className="absolute -top-2 -right-6 w-6 h-6 text-amber-glow/80 animate-spin"
              style={{ animationDuration: '4s', animationDelay: '1s' }}
            />
            <Sparkles 
              className="absolute -bottom-4 -left-6 w-7 h-7 text-lime-yellow/60 animate-spin"
              style={{ animationDuration: '5s', animationDelay: '0.5s' }}
            />
            <Sparkles 
              className="absolute -bottom-2 -right-4 w-5 h-5 text-amber-glow/70 animate-spin"
              style={{ animationDuration: '3.5s', animationDelay: '1.5s' }}
            />
          </div>

          {/* Main Headline */}
          <div className="text-center space-y-4">
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-yellow via-amber-glow to-lime-yellow animate-fade-in"
              style={{
                backgroundSize: '200% auto',
                animation: 'gradient-shift 3s ease infinite, fade-in 0.8s ease-out'
              }}
            >
              Shop Coming Soon!
            </h1>
            
            <p className="text-xl sm:text-2xl text-ivory/90 font-semibold animate-fade-in-delay">
              Something amazing is on the way
            </p>
          </div>

          {/* Excitement Indicators */}
          <div className="flex items-center gap-4 sm:gap-6 mt-4 animate-fade-in-delay-2">
            <div className="flex items-center gap-2 text-lime-yellow">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              <span className="text-sm sm:text-base font-semibold">Exciting Rewards</span>
            </div>
            <div className="flex items-center gap-2 text-amber-glow">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" style={{ animationDelay: '0.3s' }} />
              <span className="text-sm sm:text-base font-semibold">Exclusive Items</span>
            </div>
            <div className="flex items-center gap-2 text-lime-yellow">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" style={{ animationDelay: '0.6s' }} />
              <span className="text-sm sm:text-base font-semibold">Point Rewards</span>
            </div>
          </div>

          {/* Subtext Message */}
          <div className="text-center max-w-lg mx-auto mt-6 space-y-3 animate-fade-in-delay-3">
            <p className="text-ivory/80 text-base sm:text-lg leading-relaxed">
              We're putting the finishing touches on an incredible shop experience. 
              Get ready to redeem your points for exclusive rewards, badges, and more!
            </p>
            <div className="flex items-center justify-center gap-2 text-lime-yellow/90 pt-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-lime-yellow rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-lime-yellow rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-lime-yellow rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className="text-sm font-medium">Stay tuned</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.3s both;
        }

        .animate-fade-in-delay-2 {
          animation: fade-in 0.8s ease-out 0.6s both;
        }

        .animate-fade-in-delay-3 {
          animation: fade-in 0.8s ease-out 0.9s both;
        }
      `}</style>
    </div>
  )
}
