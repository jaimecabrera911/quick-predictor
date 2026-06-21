import { Image, type ImageStyle } from 'expo-image';
import { type StyleProp, type ViewStyle } from 'react-native';

type AppLogoProps = {
  variant?: 'full' | 'icon';
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function AppLogo({
  variant = 'full',
  width,
  height,
  style,
  imageStyle,
}: AppLogoProps) {
  const source =
    variant === 'full'
      ? require('@/assets/images/logo.png')
      : require('@/assets/images/icon.png');

  const w = width ?? (variant === 'full' ? 300 : 72);
  const h = height ?? (variant === 'full' ? 130 : 72);

  return (
    <Image
      source={source}
      style={[{ width: w, height: h }, imageStyle, style]}
      contentFit="contain"
    />
  );
}
