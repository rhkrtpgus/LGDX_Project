try:
    from .detector import main
except ImportError:  # pragma: no cover - direct script execution fallback
    from detector import main


if __name__ == "__main__":
    main()
