import { useRef, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => string | number;
}

/**
 * Reusable virtualized list for large datasets (1000+ rows).
 * Uses @tanstack/react-virtual for windowed rendering.
 */
export function VirtualList<T>({
  items,
  estimateSize = 56,
  overscan = 8,
  className = 'h-[600px] overflow-auto',
  renderItem,
  getKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div ref={parentRef} className={className} role="list">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vRow) => {
          const item = items[vRow.index];
          return (
            <div
              key={getKey ? getKey(item, vRow.index) : vRow.key}
              role="listitem"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${vRow.size}px`,
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              {renderItem(item, vRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
