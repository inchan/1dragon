import { useEffect, type JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@snapvid/ui';
import { useAuth } from '../../features/auth';

export function LoginPage(): JSX.Element {
	const { t } = useTranslation('common');
	const navigate = useNavigate();
	const { isAuthenticated, isLoading, signIn } = useAuth();

	useEffect(() => {
		if (isAuthenticated) {
			navigate({ to: '/dashboard' });
		}
	}, [isAuthenticated, navigate]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-gray-600">{t('common.loading')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900">SnapVid</h1>
					<p className="mt-2 text-gray-600">{t('auth.login')}</p>
				</div>

				<div className="space-y-4">
					<Button
						variant="outline"
						className="w-full h-12 justify-center gap-3 border-gray-300 hover:bg-yellow-50"
						onClick={() => signIn('kakao')}
					>
						<KakaoIcon />
						<span className="text-gray-700 font-medium">{t('auth.login_with_kakao')}</span>
					</Button>

					<Button
						variant="outline"
						className="w-full h-12 justify-center gap-3 border-gray-300 hover:bg-gray-50"
						onClick={() => signIn('google')}
					>
						<GoogleIcon />
						<span className="text-gray-700 font-medium">{t('auth.login_with_google')}</span>
					</Button>

					<Button
						variant="outline"
						className="w-full h-12 justify-center gap-3 border-gray-300 hover:bg-gray-900 hover:text-white"
						onClick={() => signIn('apple')}
					>
						<AppleIcon />
						<span className="text-gray-700 font-medium group-hover:text-white">{t('auth.login_with_apple')}</span>
					</Button>
				</div>

				<p className="text-center text-xs text-gray-500 mt-6">
					{t('auth.terms_agreement')}
				</p>
			</div>
		</div>
	);
}

function KakaoIcon(): JSX.Element {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M12 2C6.48 2 2 5.58 2 10c0 2.63 1.64 4.96 4.17 6.44-.18.66-.65 2.16-.75 2.5-.12.4.15.39.31.29.13-.08 2.1-1.42 2.94-2.01.72.2 1.49.31 2.28.31h.01c.04 0 .08 0 .12-.01C11.03 20.87 11.5 21 12 21c5.52 0 10-3.58 10-8s-4.48-8-10-8z"
				fill="#FEE500"
			/>
			<path
				d="M7.5 9.5h1v3h-1v-3zm1.75 0h.9l1.35 2.1V9.5h.9v3h-.9l-1.35-2.1V12.5h-.9v-3zm4.25 0h1v3h-1v-3zm1.75 0h.9v1.2h1.35V9.5h.9v3h-.9v-1.2h-1.35V12.5h-.9v-3z"
				fill="#000"
			/>
		</svg>
	);
}

function GoogleIcon(): JSX.Element {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
}

function AppleIcon(): JSX.Element {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
			<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
		</svg>
	);
}
