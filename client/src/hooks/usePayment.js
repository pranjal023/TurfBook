import { useMutation, useQueryClient } from '@tanstack/react-query';
import { load } from '@cashfreepayments/cashfree-js';
import { api } from '../api/client';

const MODE = import.meta.env.VITE_CASHFREE_MODE ?? 'sandbox';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function usePayment(bookingId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Ask OUR server for a payment session
      const { paymentSessionId } = (await api.post('/payments/checkout', { bookingId })).data.data;

      
      const cashfree = await load({ mode: MODE });
      if (!cashfree) throw new Error('Could not load the payment SDK. Check your connection.');
      const result = await cashfree.checkout({ paymentSessionId, redirectTarget: '_modal' });

  
      const attempts = result?.error ? 2 : 6;
      let verdict;
      for (let i = 0; i < attempts; i++) {
        verdict = (await api.post(`/payments/bookings/${bookingId}/verify`)).data.data;
        if (verdict.bookingStatus !== 'held' || verdict.outcome) break; r
        if (i < attempts - 1) await sleep(2000);
      }
      return { ...verdict, checkoutError: result?.error?.message ?? null };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}