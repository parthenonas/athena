import type {
  Pageable,
  InstructorResponse,
  CreateInstructorRequest,
  UpdateInstructorRequest,
  FilterInstructorRequest,
  CohortResponse,
  CreateCohortRequest,
  UpdateCohortRequest,
  FilterCohortRequest,
  EnrollmentResponse,
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
  FilterEnrollmentRequest
} from '@athena/types'

export const useTeaching = () => {
  const { t } = useI18n()
  const toast = useToast()

  const fetchInstructors = (params: FilterInstructorRequest) => {
    return useApi<Pageable<InstructorResponse>>('/api/instructors', {
      method: 'GET',
      params,
      watch: [
        () => params.page,
        () => params.limit,
        () => params.search,
        () => params.sortBy,
        () => params.sortOrder
      ]
    })
  }

  const fetchInstructor = (id: string) => {
    return $api<InstructorResponse>(`/api/instructors/${id}`, {
      method: 'GET'
    })
  }

  const createInstructor = async (payload: CreateInstructorRequest) => {
    try {
      const data = await $api<InstructorResponse>('/api/instructors', {
        method: 'POST',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.instructors.created'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.instructors.create-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const updateInstructor = async (id: string, payload: UpdateInstructorRequest) => {
    try {
      const data = await $api<InstructorResponse>(`/api/instructors/${id}`, {
        method: 'PATCH',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.instructors.updated'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.instructors.update-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const deleteInstructor = async (id: string) => {
    try {
      await $api(`/api/instructors/${id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.instructors.deleted'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.instructors.delete-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const fetchCohorts = (params: FilterCohortRequest) => {
    return useApi<Pageable<CohortResponse>>('/api/cohorts', {
      method: 'GET',
      params,
      watch: [
        () => params.page,
        () => params.limit,
        () => params.search,
        () => params.instructorId,
        () => params.sortBy,
        () => params.sortOrder
      ]
    })
  }

  const fetchCohort = (id: string) => {
    return $api<CohortResponse>(`/api/cohorts/${id}`, {
      method: 'GET'
    })
  }

  const createCohort = async (payload: CreateCohortRequest) => {
    try {
      const data = await $api<CohortResponse>('/api/cohorts', {
        method: 'POST',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.cohorts.created'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.cohorts.create-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const updateCohort = async (id: string, payload: UpdateCohortRequest) => {
    try {
      const data = await $api<CohortResponse>(`/api/cohorts/${id}`, {
        method: 'PATCH',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.cohorts.updated'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.cohorts.update-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const deleteCohort = async (id: string) => {
    try {
      await $api(`/api/cohorts/${id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.cohorts.deleted'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.cohorts.delete-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const fetchEnrollments = (params: FilterEnrollmentRequest) => {
    return useApi<Pageable<EnrollmentResponse>>('/api/enrollments', {
      method: 'GET',
      params,
      watch: [
        () => params.page,
        () => params.limit,
        () => params.cohortId,
        () => params.ownerId,
        () => params.sortBy,
        () => params.sortOrder
      ]
    })
  }

  const fetchEnrollment = (id: string) => {
    return $api<EnrollmentResponse>(`/api/enrollments/${id}`, {
      method: 'GET'
    })
  }

  const createEnrollment = async (payload: CreateEnrollmentRequest) => {
    try {
      const data = await $api<EnrollmentResponse>('/api/enrollments', {
        method: 'POST',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.enrollments.created'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.enrollments.create-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const updateEnrollment = async (id: string, payload: UpdateEnrollmentRequest) => {
    try {
      const data = await $api<EnrollmentResponse>(`/api/enrollments/${id}`, {
        method: 'PATCH',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.enrollments.updated'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.enrollments.update-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const deleteEnrollment = async (id: string) => {
    try {
      await $api(`/api/enrollments/${id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.enrollments.deleted'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.enrollments.delete-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  return {
    fetchInstructors,
    fetchInstructor,
    createInstructor,
    updateInstructor,
    deleteInstructor,
    fetchCohorts,
    fetchCohort,
    createCohort,
    updateCohort,
    deleteCohort,
    fetchEnrollments,
    fetchEnrollment,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment
  }
}
