import type { ComponentPropsWithoutRef } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={[styles.btn, styles[variant], className ?? ''].join(' ').trim()} {...rest} />
}
