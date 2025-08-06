import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLoginRedirect } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, AlertCircle } from "lucide-react";

export default function Login() {
  const [location, setLocation] = useLocation();
  const [isVKConfigured, setIsVKConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Redirect if already authenticated
  const shouldRedirect = useLoginRedirect();

  useEffect(() => {
    // Check if VK ID is configured
    fetch('/api/auth/vk-config')
      .then(res => res.json())
      .then(data => {
        setIsVKConfigured(data.configured);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to check VK config:', err);
        setIsLoading(false);
      });

    // Check for error parameters
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'vk_error':
          setError('Ошибка авторизации ВКонтакте');
          break;
        case 'no_code':
          setError('Не получен код авторизации');
          break;
        case 'session_error':
          setError('Ошибка создания сессии');
          break;
        case 'auth_failed':
          setError('Ошибка аутентификации');
          break;
        default:
          setError('Неизвестная ошибка');
      }
    }
  }, []);

  const handleVKLogin = () => {
    if (isVKConfigured) {
      window.location.href = '/auth/vk';
    }
  };

  const handleContinueWithoutAuth = () => {
    setLocation('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Загрузка...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            🐎 Система мониторинга лошадей
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Войдите в систему для доступа к панели управления
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50" data-testid="error-alert">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {isVKConfigured ? (
            <Button
              onClick={handleVKLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-vk-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Войти через VK ID
            </Button>
          ) : (
            <Alert className="border-yellow-200 bg-yellow-50" data-testid="config-warning">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                VK ID не настроен. Обратитесь к администратору для настройки аутентификации.
              </AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">или</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleContinueWithoutAuth}
            className="w-full"
            data-testid="button-continue-without-auth"
          >
            Продолжить без авторизации
          </Button>

          <p className="text-xs text-gray-500 text-center mt-4">
            При входе без авторизации функции могут быть ограничены
          </p>
        </CardContent>
      </Card>
    </div>
  );
}