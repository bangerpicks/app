'use client'

import { ShopItemProps } from '@/types/shop'
import { ShoppingBag, Package } from 'lucide-react'
import Image from 'next/image'

export function ShopItem({ item, userPoints, isRedeemed = false, onRedeem }: ShopItemProps) {
  const canAfford = userPoints >= item.pointsCost
  const isAvailable = item.status === 'active' && (item.stock === null || (item.stock && item.stock > 0))
  const isDisabled = !canAfford || !isAvailable || isRedeemed

  const handleRedeem = () => {
    if (!isDisabled) {
      onRedeem(item.itemId)
    }
  }

  return (
    <div className="flex flex-col bg-midnight-violet/50 border-2 border-ivory/10 rounded-lg overflow-hidden hover:border-ivory/20 transition-colors">
      {/* Item Image */}
      <div className="relative w-full aspect-square bg-midnight-violet/80 flex items-center justify-center">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.category === 'digital' ? (
              <Package className="w-16 h-16 text-ivory/40" />
            ) : (
              <ShoppingBag className="w-16 h-16 text-ivory/40" />
            )}
          </div>
        )}
        {/* Category Badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              item.category === 'digital'
                ? 'bg-amber-glow text-midnight-violet'
                : 'bg-lime-yellow text-midnight-violet'
            }`}
          >
            {item.category === 'digital' ? 'Digital' : 'Physical'}
          </span>
        </div>
        {/* Sold Out Overlay */}
        {item.status === 'sold_out' || (item.stock !== null && item.stock === 0) ? (
          <div className="absolute inset-0 bg-midnight-violet/80 flex items-center justify-center">
            <span className="text-ivory font-bold text-lg">Sold Out</span>
          </div>
        ) : null}
        {/* Featured Badge */}
        {item.featured && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 rounded text-xs font-bold bg-lime-yellow text-midnight-violet">
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex flex-col gap-2 p-4">
        <div>
          <h3 className="text-ivory font-semibold text-lg mb-1">{item.name}</h3>
          <p className="text-ivory/70 text-sm line-clamp-2">{item.description}</p>
        </div>

        {/* Points Cost */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-lime-yellow font-bold text-xl">{item.pointsCost}</span>
            <span className="text-ivory/70 text-sm">pts</span>
          </div>
          {item.stock != null && item.stock > 0 && (
            <span className="text-ivory/50 text-xs">{item.stock} left</span>
          )}
        </div>

        {/* Redeem Button */}
        <button
          onClick={handleRedeem}
          disabled={isDisabled}
          className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${
            isDisabled
              ? 'bg-ivory/10 text-ivory/40 cursor-not-allowed'
              : 'bg-lime-yellow text-midnight-violet hover:bg-lime-yellow/90 active:bg-lime-yellow/80'
          }`}
        >
          {isRedeemed
            ? 'Already Redeemed'
            : !canAfford
              ? 'Insufficient Points'
              : item.status === 'sold_out' || (item.stock !== null && item.stock === 0)
                ? 'Sold Out'
                : 'Redeem'}
        </button>
      </div>
    </div>
  )
}
