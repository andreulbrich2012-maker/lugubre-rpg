import Button from './Button';

export default function LoadingButton({ loading, loadingText, children, ...props }) {
  return (
    <Button disabled={loading || props.disabled} {...props}>
      <span className="inline-flex items-center justify-center gap-2">
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />}
        {loading ? loadingText : children}
      </span>
    </Button>
  );
}
