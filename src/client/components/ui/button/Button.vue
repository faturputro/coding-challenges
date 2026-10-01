<script setup lang="ts">
import { cn } from '@client/lib/utils'
import { Loader2 } from 'lucide-vue-next'
import { Primitive, type PrimitiveProps } from 'radix-vue'
import type { HTMLAttributes } from 'vue'
import { type ButtonVariants, buttonVariants } from '.'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  as?: string
  type?: 'button' | 'submit' | 'reset'
  class?: HTMLAttributes['class'],
  loading?: boolean
  disabled?: boolean
  onClick?: (e: MouseEvent) => void
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  type: 'button',
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :type="as === 'button' ? type : undefined"
    :class="cn(buttonVariants({ variant, size }), props.class)"
    class="flex items-center"
    @click="onClick"
    :disabled="$props.disabled || $props.loading"
  >
    <Loader2 v-if="$props.loading" class="w-4 h-4 mr-2 animate-spin" />
    <slot v-if="!!$slots.default" />
  </Primitive>
</template>
