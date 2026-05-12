import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Lock, MenuBook } from '@mui/icons-material';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import api from '../services/api';

GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.mjs`;

function buildWatermark(user) {
  const username = user?.username || 'usuario';
  const oficina = user?.oficinaNombre || user?.oficina || 'Casa Blanca';
  const timestamp = new Date().toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return `${username} · ${oficina} · ${timestamp}`;
}

function ManualPageCanvas({ pdf, pageNumber, watermark }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [size, setSize] = useState(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      if (width > 0) {
        setSize(width);
      }
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;

    async function renderPage() {
      if (!pdf || !size || !canvasRef.current) {
        return;
      }

      setRendering(true);
      const page = await pdf.getPage(pageNumber);
      if (cancelled) {
        return;
      }

      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.min(size, 980);
      const scale = availableWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { alpha: false });
      const outputScale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, viewport.width, viewport.height);

      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise;

      if (!cancelled) {
        setRendering(false);
      }
    }

    renderPage().catch((error) => {
      if (error?.name !== 'RenderingCancelledException') {
        console.error('No se pudo renderizar la pagina del manual:', error);
      }
      if (!cancelled) {
        setRendering(false);
      }
    });

    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdf, pageNumber, size]);

  return (
    <Paper
      ref={containerRef}
      elevation={0}
      onContextMenu={(event) => event.preventDefault()}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 1, md: 2 },
        backgroundColor: '#f4f6f8',
        border: '1px solid',
        borderColor: 'divider',
        userSelect: 'none',
      }}
    >
      {rendering ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.72)',
            zIndex: 2,
          }}
        >
          <CircularProgress size={26} />
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          aria-label={`Pagina ${pageNumber} del manual operativo`}
          style={{
            maxWidth: '100%',
            height: 'auto',
            boxShadow: '0 18px 48px rgba(15, 23, 42, 0.14)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      </Box>

      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          opacity: 0.16,
          transform: 'rotate(-28deg) scale(1.2)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 4,
          alignContent: 'center',
          color: '#1f2937',
          fontWeight: 800,
          fontSize: { xs: 12, md: 15 },
          textTransform: 'uppercase',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        {Array.from({ length: 18 }).map((_, index) => (
          <Box key={index}>{watermark}</Box>
        ))}
      </Box>
    </Paper>
  );
}

function ManualOperativoPage({ user }) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const watermark = useMemo(() => buildWatermark(user), [user]);

  const loadManual = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/manual/operativo', {
        responseType: 'arraybuffer',
        headers: {
          Accept: 'application/pdf',
        },
      });
      const task = getDocument({
        data: new Uint8Array(response.data),
        disableAutoFetch: true,
        disableStream: true,
      });
      const loadedPdf = await task.promise;
      setPdf(loadedPdf);
      setNumPages(loadedPdf.numPages);
    } catch (requestError) {
      console.error('No se pudo cargar el manual operativo:', requestError);
      setError('No se pudo cargar el manual operativo. Verifica tu sesion e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManual();
  }, [loadManual]);

  useEffect(() => {
    const preventProtectedActions = (event) => {
      const key = event.key?.toLowerCase();
      const blocked =
        key === 'printscreen' ||
        ((event.ctrlKey || event.metaKey) && ['p', 's', 'u', 'c', 'a'].includes(key));

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', preventProtectedActions, true);
    document.addEventListener('copy', preventProtectedActions, true);
    document.addEventListener('cut', preventProtectedActions, true);

    return () => {
      document.removeEventListener('keydown', preventProtectedActions, true);
      document.removeEventListener('copy', preventProtectedActions, true);
      document.removeEventListener('cut', preventProtectedActions, true);
    };
  }, []);

  useEffect(() => () => {
    if (pdf) {
      pdf.destroy();
    }
  }, [pdf]);

  return (
    <Stack spacing={2.5} onContextMenu={(event) => event.preventDefault()}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'rgba(36, 93, 156, 0.04)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <MenuBook color="primary" />
            <Box>
              <Typography variant="h5">Manual operativo</Typography>
              <Typography variant="body2" color="text.secondary">
                Consulta interna con marca de agua por usuario y controles restringidos.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
            <Lock fontSize="small" />
            <Typography variant="body2">Solo lectura</Typography>
          </Stack>
        </Stack>
      </Paper>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Paper
          elevation={0}
          sx={{
            minHeight: 340,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CircularProgress />
        </Paper>
      ) : null}

      {!loading && pdf ? (
        <Stack spacing={2}>
          {Array.from({ length: numPages }).map((_, index) => (
            <React.Fragment key={index + 1}>
              <ManualPageCanvas pdf={pdf} pageNumber={index + 1} watermark={watermark} />
              {index + 1 < numPages ? <Divider /> : null}
            </React.Fragment>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

export default ManualOperativoPage;
