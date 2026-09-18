import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  as?: ElementType
  dashed?: boolean
  children: ReactNode
}

export function Card({ as: Tag = 'div', dashed = false, className, children, ...rest }: CardProps) {
  return (
    <Tag className={[styles.card, dashed ? styles.dashed : '', className ?? ''].join(' ').trim()} {...rest}>
      {children}
    </Tag>
  )
}
