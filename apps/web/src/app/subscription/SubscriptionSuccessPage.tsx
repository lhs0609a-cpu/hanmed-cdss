import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SubscriptionSuccessPage() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 구독 정보 및 사용량 갱신
    queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
    queryClient.invalidateQueries({ queryKey: ['usage'] });
  }, [queryClient]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            구독이 완료되었습니다!
          </h1>
          <p className="text-gray-600 mb-8">
            이제 온고지신 AI의 더 많은 기능을 이용할 수 있습니다.
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
              <Link to="/consultation">
                <Sparkles className="mr-2 h-4 w-4" />
                AI 진료 시작하기
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/subscription">
                구독 정보 확인
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              결제 관련 문의:{' '}
              <a
                href="mailto:support@ongojisin.ai"
                className="text-teal-600 hover:underline"
              >
                support@ongojisin.ai
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
