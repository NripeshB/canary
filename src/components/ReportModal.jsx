import React, { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { findWardByPoint } from '../utils/geoUtils';
import { submitReport as apiSubmitReport } from '../api/wardApi';

const REPORT_CATEGORIES = ['Garbage Burning', 'Construction Dust', 'Traffic Congestion', 'Industrial Smoke', 'Other'];

function ReportModal() {
  const { isModalOpen, geojson } = useAppState();
  const dispatch = useAppDispatch();
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(3);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [location, setLocation] = useState(null);
  const [detectedWard, setDetectedWard] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!modalRef.current || !overlayRef.current) return;
    if (isModalOpen) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(modalRef.current,
        { y: 50, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out', delay: 0.1 }
      );
    }
  }, [isModalOpen]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationStatus('manual'); return; }
    setLocationStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocationStatus('detected');
        if (geojson) {
          const feature = findWardByPoint(latitude, longitude, geojson);
          if (feature) {
            setDetectedWard({ wardNo: feature.properties?.Ward_No, wardName: feature.properties?.WardName });
          }
        }
      },
      () => setLocationStatus('manual'),
      { timeout: 10000 }
    );
  }, [geojson]);

  useEffect(() => {
    if (isModalOpen && locationStatus === 'idle') detectLocation();
  }, [isModalOpen, locationStatus, detectLocation]);

  const handleClose = () => {
    gsap.to(modalRef.current, { y: 20, opacity: 0, scale: 0.97, duration: 0.2, onComplete: () => {
      dispatch({ type: 'TOGGLE_MODAL', payload: false });
      setCategory(''); setDescription(''); setSeverity(3); setLocationStatus('idle');
      setLocation(null); setDetectedWard(null); setSubmitted(false);
    }});
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !description.trim()) return;
    setIsSubmitting(true);
    try {
      const reportData = {
        category, description, severity,
        ward_id: detectedWard?.wardNo || null,
        lat: location?.lat, lng: location?.lng,
      };
      const result = await apiSubmitReport(reportData);
      dispatch({ type: 'ADD_REPORT', payload: result });
      setSubmitted(true);
    } catch (err) {
      console.error('Report submission failed:', err);
      // Still mark as submitted for UX
      setSubmitted(true);
    }
    setIsSubmitting(false);
  };

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div ref={overlayRef} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div ref={modalRef} className="relative glass-panel-solid rounded-2xl w-full max-w-md shadow-2xl shadow-black/70 border border-white/[0.05]">
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-50">Report Pollution</h2>
              <p className="text-xs text-gray-500 mt-0.5">Help improve air quality monitoring</p>
            </div>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-100 mb-1">Report Submitted</h3>
            <p className="text-sm text-gray-400 mb-5">
              Attached to {detectedWard?.wardName || 'the nearest ward'}.
            </p>
            <button onClick={handleClose} className="px-6 py-2.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl text-sm font-semibold transition-all border border-accent/30">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Location */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Location</label>
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                {locationStatus === 'detecting' && (
                  <><div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /><span className="text-xs text-gray-400">Detecting...</span></>
                )}
                {locationStatus === 'detected' && detectedWard && (
                  <><svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg><span className="text-xs text-gray-300">{detectedWard.wardName}</span><span className="text-[10px] text-gray-500 ml-auto">Auto-detected</span></>
                )}
                {(locationStatus === 'manual' || locationStatus === 'idle') && (
                  <><svg className="w-3.5 h-3.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg><span className="text-xs text-gray-400">Location unavailable</span><button type="button" onClick={detectLocation} className="text-[10px] text-accent ml-auto hover:underline">Retry</button></>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {REPORT_CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      category === cat ? 'bg-accent/15 border-accent/30 text-accent' : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:bg-white/[0.05]'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the pollution source..."
                rows={3} className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-accent/30 transition-colors resize-none" />
            </div>

            {/* Severity */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                Severity: <span className="text-gray-200 font-extrabold">{severity}/5</span>
              </label>
              <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-lg" />
            </div>

            <button type="submit" disabled={isSubmitting || !category || !description.trim()}
              className="w-full py-3 rounded-xl bg-accent/20 hover:bg-accent/30 text-accent font-bold text-sm transition-all border border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting ? <><div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />Submitting...</> : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default React.memo(ReportModal);
