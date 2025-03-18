// lib/hooks/useTemplates.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { WorkoutTemplate } from '@/types/templates';
import { useTemplateService } from '@/components/DatabaseProvider';
import { useTemplateRefresh } from '@/lib/stores/libraryStore';

export function useTemplates() {
  const templateService = useTemplateService();
  const { refreshCount, refreshTemplates, isLoading, setLoading } = useTemplateRefresh();
  
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [archivedTemplates, setArchivedTemplates] = useState<WorkoutTemplate[]>([]);
  
  // Add a loaded flag to track if we've successfully loaded templates at least once
  const hasLoadedRef = useRef(false);

  const loadTemplates = useCallback(async (limit: number = 50, offset: number = 0, showLoading: boolean = true) => {
    try {
      // Only show loading indicator if we haven't loaded before or if explicitly requested
      if (showLoading && (!hasLoadedRef.current || templates.length === 0)) {
        setLoading(true);
      }
      
      const data = await templateService.getAllTemplates(limit, offset);
      setTemplates(data);
      hasLoadedRef.current = true;
      setError(null);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err : new Error('Failed to load templates'));
      // Use empty array if database isn't ready
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [templateService, setLoading, templates.length]);

  // Load templates when refreshCount changes
  useEffect(() => {
    loadTemplates();
  }, [refreshCount, loadTemplates]);

  // The rest of your methods remain the same
  const getTemplate = useCallback(async (id: string) => {
    try {
      return await templateService.getTemplate(id);
    } catch (err) {
      console.error('Error getting template:', err);
      throw err;
    }
  }, [templateService]);

  const createTemplate = useCallback(async (template: Omit<WorkoutTemplate, 'id'>) => {
    try {
      // Add default values for new properties
      const templateWithDefaults = {
        ...template,
        isArchived: template.isArchived !== undefined ? template.isArchived : false,
      };
      
      const id = await templateService.createTemplate(templateWithDefaults);
      refreshTemplates(); // Use the store's refresh function
      return id;
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    }
  }, [templateService, refreshTemplates]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<WorkoutTemplate>) => {
    try {
      await templateService.updateTemplate(id, updates);
      refreshTemplates(); // Use the store's refresh function
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  }, [templateService, refreshTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await templateService.deleteTemplate(id);
      setTemplates(current => current.filter(t => t.id !== id));
      refreshTemplates(); // Also trigger a refresh to ensure consistency
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  }, [templateService, refreshTemplates]);

  const archiveTemplate = useCallback(async (id: string, archive: boolean = true) => {
    try {
      await templateService.archiveTemplate(id, archive);
      refreshTemplates(); // Use the store's refresh function
    } catch (err) {
      console.error(`Error ${archive ? 'archiving' : 'unarchiving'} template:`, err);
      throw err;
    }
  }, [templateService, refreshTemplates]);

  const loadArchivedTemplates = useCallback(async (limit: number = 50, offset: number = 0) => {
    try {
      setLoading(true);
      const data = await templateService.getArchivedTemplates(limit, offset);
      setArchivedTemplates(data);
      setError(null);
    } catch (err) {
      console.error('Error loading archived templates:', err);
      setError(err instanceof Error ? err : new Error('Failed to load archived templates'));
      setArchivedTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [templateService, setLoading]);

  // Add a silentRefresh method that doesn't show loading indicators
  const silentRefresh = useCallback(() => {
    loadTemplates(50, 0, false);
  }, [loadTemplates]);

  return {
    templates,
    archivedTemplates,
    loading: isLoading,
    error,
    loadTemplates,
    silentRefresh,
    loadArchivedTemplates, 
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate, 
    refreshTemplates
  };
}