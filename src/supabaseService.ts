import { supabase } from './supabaseClient';
import { format, parseISO, addDays, isWeekend, endOfMonth } from 'date-fns';
import { ROLES } from './types';

export const supabaseService = {
    async getMembers() {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('attendance_order');
        if (error) throw error;
        return data.map(m => ({
            id: m.id,
            rollNo: m.roll_no,
            name: m.name,
            order: m.attendance_order,
            photoUrl: m.photo_url
        }));
    },

    async getSchedule() {
        // Fetch all data with individual error handling to prevent one failure from blocking all
        try {
            const [
                schedRes,
                iceRes,
                themeRes
            ] = await Promise.allSettled([
                supabase.from('schedule').select(`
                    *,
                    originalMember:members!original_member_id(name),
                    currentMember:members!current_member_id(name),
                    replacedByMember:members!replaced_by_id(name)
                `).order('date'),
                supabase.from('daily_icebreaker').select('*'),
                supabase.from('daily_theme').select('*')
            ]);

            const scheduleData = (schedRes.status === 'fulfilled' && !schedRes.value.error) ? schedRes.value.data : [];
            const icebreakers = (iceRes.status === 'fulfilled' && !iceRes.value.error) ? iceRes.value.data : [];
            const themes = (themeRes.status === 'fulfilled' && !themeRes.value.error) ? themeRes.value.data : [];

            if (schedRes.status === 'rejected' || (schedRes.status === 'fulfilled' && schedRes.value.error)) {
                console.error('Schedule fetch error:', (schedRes as any).reason || (schedRes as any).value?.error);
            }

            // Get all unique dates from all three sources
            const allDates = new Set<string>();
            scheduleData?.forEach(s => allDates.add(typeof s.date === 'string' ? s.date.split('T')[0] : s.date));
            icebreakers?.forEach(i => allDates.add(typeof i.date === 'string' ? i.date.split('T')[0] : i.date));
            themes?.forEach(t => allDates.add(typeof t.date === 'string' ? t.date.split('T')[0] : t.date));

            const result: any[] = [];

            allDates.forEach(dateStr => {
                const rolesForDate = scheduleData?.filter(s => (typeof s.date === 'string' ? s.date.split('T')[0] : s.date) === dateStr) || [];
                const ice = icebreakers?.find(i => (typeof i.date === 'string' ? i.date.split('T')[0] : i.date) === dateStr);
                const th = themes?.find(t => (typeof t.date === 'string' ? t.date.split('T')[0] : t.date) === dateStr);

                if (rolesForDate.length > 0) {
                    rolesForDate.forEach(s => {
                        result.push({
                            id: s.id,
                            date: s.date,
                            role_id: s.role_id, // Ensure we use roleId or role_id consistently as per App.tsx usage
                            roleId: s.role_id,   // Providing both to be safe
                            originalMemberId: s.original_member_id,
                            currentMemberId: s.current_member_id,
                            status: s.status,
                            isSubstitution: s.is_substitution,
                            replacedById: s.replaced_by_id,
                            originalMemberName: s.originalMember?.name,
                            currentMemberName: s.currentMember?.name,
                            replacedByName: s.replacedByMember?.name,
                            icebreaker: ice?.game_name,
                            theme: th?.theme
                        });
                    });
                } else {
                    // Add a "meta" entry for dates with theme/icebreaker but no roles
                    result.push({
                        id: -1, // Dummy ID
                        date: dateStr,
                        roleId: 'META',
                        theme: th?.theme,
                        icebreaker: ice?.game_name
                    });
                }
            });

            // Sort by date, then by role order
            return result.sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                const indexA = ROLES.findIndex(r => r.id === a.roleId);
                const indexB = ROLES.findIndex(r => r.id === b.roleId);
                return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
            });
        } catch (error) {
            console.error('Fatal error in getSchedule:', error);
            return [];
        }
    },

    async getThemes(): Promise<{ date: string; theme: string }[]> {
        const { data, error } = await supabase.from('daily_theme').select('*');
        console.log('[DEBUG] daily_theme data:', data, 'error:', error);
        if (error) throw error;
        return (data || []).map(t => ({ date: t.date.split('T')[0], theme: t.theme }));
    },

    async getIcebreakers(): Promise<{ date: string; game_name: string }[]> {
        const { data, error } = await supabase.from('daily_icebreaker').select('*');
        console.log('[DEBUG] daily_icebreaker data:', data, 'error:', error);
        if (error) throw error;
        return (data || []).map(i => ({ date: i.date.split('T')[0], game_name: i.game_name }));
    },

    async updateTheme(date: string, theme: string) {
        console.log('[DEBUG] updateTheme called with:', date, theme);
        const { data, error } = await supabase
            .from('daily_theme')
            .upsert({ date, theme }, { onConflict: 'date' })
            .select();
        console.log('[DEBUG] updateTheme result:', data, 'error:', error);
        if (error) throw error;
    },

    async updateIcebreaker(date: string, gameName: string) {
        console.log('[DEBUG] updateIcebreaker called with:', date, gameName);
        const { data, error } = await supabase
            .from('daily_icebreaker')
            .upsert({ date, game_name: gameName }, { onConflict: 'date' })
            .select();
        console.log('[DEBUG] updateIcebreaker result:', data, 'error:', error);
        if (error) throw error;
    },

    async getIcebreakerBank() {
        const { data, error } = await supabase
            .from('icebreaker_bank')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    },

    async addIcebreakerToBank(name: string, description: string) {
        const { error } = await supabase
            .from('icebreaker_bank')
            .insert({ name, description });
        if (error) throw error;
    },

    async deleteIcebreakerFromBank(id: number) {
        const { error } = await supabase
            .from('icebreaker_bank')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getAnnouncements() {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getQueries() {
        const { data, error } = await supabase
            .from('queries')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async submitQuery(name: string, rollNo: string, message: string) {
        const { error } = await supabase
            .from('queries')
            .insert({ name, roll_no: rollNo, message, date: format(new Date(), 'yyyy-MM-dd') });
        if (error) throw error;
    },

    async resolveQuery(id: number) {
        const { error } = await supabase
            .from('queries')
            .update({ status: 'resolved' })
            .eq('id', id);
        if (error) throw error;
    },

    async hasUndo() {
        const { count, error } = await supabase
            .from('schedule_history')
            .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return (count || 0) > 0;
    },

    async markAbsent(scheduleId: number) {
        const { data: entry, error: entryError } = await supabase
            .from('schedule')
            .select('*')
            .eq('id', scheduleId)
            .single();

        if (entryError || !entry) throw new Error("Entry not found");

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (entry.date < todayStr) {
            throw new Error("Cannot modify past attendance");
        }

        // If backup is absent, just mark them absent
        if (entry.role_id.startsWith('BACKUP_')) {
            await supabase.from('schedule').update({ status: 'absent' }).eq('id', scheduleId);
            return;
        }

        // Find all potential backups for this specific date
        const { data: backups } = await supabase
            .from('schedule')
            .select('*')
            .eq('date', entry.date)
            .in('role_id', ['BACKUP_1', 'BACKUP_2', 'BACKUP_3'])
            .order('role_id');

        let availableBackup = null;
        for (const b of backups || []) {
            // ATOMICALLY try to claim this backup by updating its status ONLY if it's still 'scheduled'
            // This prevents race conditions where two absentees pick the same backup at the same time
            const { data: claimed, error: claimError } = await supabase
                .from('schedule')
                .update({ status: 'absent' })
                .eq('id', b.id)
                .eq('status', 'scheduled')
                .select();

            if (!claimError && claimed && claimed.length > 0) {
                availableBackup = claimed[0];
                break;
            }
        }

        if (availableBackup) {
            const backupMemberId = availableBackup.original_member_id;
            const absenteeMemberId = entry.original_member_id;

            // 1. Assign backup to this role today
            await supabase.from('schedule').update({
                current_member_id: backupMemberId,
                is_substitution: true,
                replaced_by_id: absenteeMemberId,
                status: entry.date < todayStr ? 'completed' : 'scheduled'
            }).eq('id', scheduleId);

            // Note: Backup's own slot was already marked 'absent' in the atomic claim step above.

            // 3. Compensation Role: Find the FIRST meeting where the absentee DOES NOT have a main role
            // This prevents "Double Booking" bugs (e.g. Haricharan appearing twice)
            const { data: futureMeetings } = await supabase
                .from('schedule')
                .select('date')
                .gt('date', entry.date)
                .order('date', { ascending: true });

            const uniqueDates = Array.from(new Set(futureMeetings?.map(m => m.date) || []));

            let targetDate = null;
            for (const date of uniqueDates) {
                const { data: rolesOnDate } = await supabase
                    .from('schedule')
                    .select('id, role_id')
                    .eq('date', date)
                    .eq('original_member_id', absenteeMemberId);

                // If they have no roles (unlikely) or ONLY have a backup role, they are 'free' to take the compensation role
                const isFree = !rolesOnDate || rolesOnDate.length === 0 || rolesOnDate.every(r => r.role_id.startsWith('BACKUP_'));
                if (isFree) {
                    targetDate = date;
                    break;
                }
            }

            if (targetDate) {
                // Find the backup's original role on that target date to give to the absentee
                const { data: backupRoleToTake } = await supabase
                    .from('schedule')
                    .select('id')
                    .eq('date', targetDate)
                    .eq('original_member_id', backupMemberId)
                    .single();

                if (backupRoleToTake) {
                    await supabase.from('schedule').update({
                        current_member_id: absenteeMemberId,
                        is_substitution: true,
                        replaced_by_id: backupMemberId
                    }).eq('id', backupRoleToTake.id);
                }
            }
        } else {
            // No backup available
            await supabase.from('schedule').update({ status: 'absent' }).eq('id', scheduleId);
        }
    },

    async markPresent(scheduleId: number) {
        const { data: entry, error: entryError } = await supabase
            .from('schedule')
            .select('*')
            .eq('id', scheduleId)
            .single();

        if (entryError || !entry) throw new Error("Entry not found");

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (entry.date < todayStr) throw new Error("Cannot modify past attendance");

        const newStatus = entry.date < todayStr ? 'completed' : 'scheduled';

        if (entry.is_substitution) {
            const backupMemberId = entry.current_member_id;
            const absenteeMemberId = entry.original_member_id;

            // 1. Restore the backup's placeholder status for today
            const { data: backupPlaceholder } = await supabase
                .from('schedule')
                .select('id')
                .eq('date', entry.date)
                .eq('original_member_id', backupMemberId)
                .like('role_id', 'BACKUP_%')
                .single();

            if (backupPlaceholder) {
                await supabase.from('schedule').update({ status: newStatus }).eq('id', backupPlaceholder.id);
            }

            // 2. Revert the SPECIFIC role shift on the future date
            // We only revert if that future entry is currently held by the absentee AND marks the backup as the one replaced
            await supabase.from('schedule').update({
                current_member_id: backupMemberId,
                is_substitution: false,
                replaced_by_id: null
            })
                .gt('date', entry.date)
                .eq('original_member_id', backupMemberId)
                .eq('current_member_id', absenteeMemberId)
                .eq('replaced_by_id', backupMemberId);
        }

        await supabase.from('schedule').update({
            current_member_id: entry.original_member_id,
            is_substitution: false,
            replaced_by_id: null,
            status: newStatus
        }).eq('id', scheduleId);
    },

    async updateSchedule(scheduleId: number, memberId: number) {
        const { error } = await supabase
            .from('schedule')
            .update({ current_member_id: memberId, is_substitution: true, replaced_by_id: memberId })
            .eq('id', scheduleId);
        if (error) throw error;
    },

    async deleteMonthSchedule(month: string, year: string) {
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        // Create a date for the first of the month
        const baseDate = new Date(yearNum, monthNum - 1, 1);
        const start = format(baseDate, 'yyyy-MM-01');
        const end = format(endOfMonth(baseDate), 'yyyy-MM-dd');

        await supabase.from('schedule').delete().gte('date', start).lte('date', end).eq('status', 'scheduled');
        await supabase.from('daily_icebreaker').delete().gte('date', start).lte('date', end);
        await supabase.from('daily_theme').delete().gte('date', start).lte('date', end);
    },

    async generateSchedule(startDate: string) {
        const { data: members } = await supabase.from('members').select('*').order('attendance_order');
        if (!members || members.length === 0) throw new Error("No members found");

        const { data: holidaysData } = await supabase.from('holidays').select('date');
        const holidays = holidaysData?.map(h => h.date) || [];

        const baselineDate = parseISO('2026-02-11');

        // Roles grouped by Triad (3 roles per group)
        const roleGroups = [
            ["TMOD", "GE", "TTM"],
            ["TIMER", "AH_COUNTER", "GRAMMARIAN"],
            ["SPEAKER_1", "SPEAKER_2", "SPEAKER_3"],
            ["EVALUATOR_1", "EVALUATOR_2", "EVALUATOR_3"],
            ["TT_SPEAKER_1", "TT_SPEAKER_2", "TT_SPEAKER_3"]
        ];

        // The rotation mapping derived from the February spreadsheet images
        const triadRotationMappings = [
            [1, 2, 3, 4, 5], // Step 0: [1,2,3,4,5]
            [5, 4, 1, 3, 2], // Step 1: Exact match for Feb 17, 18, 19, 20
            [2, 1, 4, 5, 3], // Step 2: Exact match for Feb 21, 24, 25, 26
            [4, 5, 2, 1, 3], // Step 3: Predicted next logic
            [3, 3, 5, 2, 1]  // Step 4: Predicted next logic
        ];

        const febHardcoded: Record<string, string[]> = {
            "2026-02-11": ["NAVANEETHA KRISHNAN.R", "ALLEN VICTOR.A", "HARSHITHAA SHREE.R", "KARTHICK PANDIAN.M", "KABIL VISHWA.TM", "HARI PRASATH.G", "SHARMILA.J", "HEMA VARSHINI.A", "HARSHINI.S", "KARTHIKEYAN.P", "DHARUNYA SHREE.G", "HIBSA FARITH.S.H", "DHAKSHANA.K", "ABISHEK.S", "HARSHINI.S.D"],
            "2026-02-12": ["HARICHARAN.S.P", "SAKTHI DIVASHKAR.M", "HARISH KARTHICK.R", "BALAJI.N", "NITESH VARMAN.M", "MAHENDRAN.N.P", "VENKATAPRIYA.S", "YUVASRI.K", "SUJITHA.J.T", "PADMASINDUJA.K", "LAKSHMI.L", "BOOPESH.K.V", "SENTHAMILSELVI.M", "KHAN MOHAMAD.S", "SWETHA ROSE.S"],
            "2026-02-13": ["VIMAL.V.S", "RAHUL.P", "MOHAMADYUNUS.R", "PRIYADHARSHINI.K", "HARIHARAN.S", "YETHEESHWAR.B.R", "LATHIKA.S", "DEVIPRIYA.T", "SANTHOSHKANNA.S", "ABISHEK MILTON.T", "DIVYESH SANKAR.N.K", "GOKUL.S", "YOGAHARANI.A", "MAGATHI.M", "SHRUTI.K"],
            "2026-02-16": ["MATTHEW PAULS.A", "GURU VIGNESHWARAN.S", "BRINTHA.J", "MAHALAKSHMI.G", "UMA MAHESWARI.M", "YOGESH.K", "GAUTHAM.S", "SRIMATHI.B", "PRINCE VICTOR.A", "PRADHIKSHA.M.P", "DINESH PANDI.R", "YAZHINI.M", "HARSHVARDHAN.S", "MOHAMAD SALMANKHAN.N", "DEEPIKASRI.R.K"],
            "2026-02-17": ["DHAKSHANA.K", "ABISHEK.S", "HARSHINI.S.D", "KARTHIKEYAN.P", "DHARUNYA SHREE.G", "HIBSA FARITH.S.H", "NAVANEETHA KRISHNAN.R", "ALLEN VICTOR.A", "HARSHITHAA SHREE.R", "SHARMILA.J", "HEMA VARSHINI.A", "HARSHINI.S", "KARTHICK PANDIAN.M", "KABIL VISHWA.TM", "HARI PRASATH.G"],
            "2026-02-18": ["SENTHAMILSELVI.M", "KHAN MOHAMAD.S", "SWETHA ROSE.S", "PADMASINDUJA.K", "LAKSHMI.L", "BOOPESH.K.V", "HARICHARAN.S.P", "SAKTHI DIVASHKAR.M", "HARISH KARTHICK.R", "VENKATAPRIYA.S", "YUVASRI.K", "SUJITHA.J.T", "BALAJI.N", "NITESH VARMAN.M", "MAHENDRAN.N.P"],
            "2026-02-19": ["YOGAHARANI.A", "MAGATHI.M", "SHRUTI.K", "ABISHEK MILTON.T", "DIVYESH SANKAR.N.K", "GOKUL.S", "VIMAL.V.S", "RAHUL.P", "MOHAMAD YUNUS.R", "LATHIKA.S", "DEVIPRIYA.T", "SANTHOSH KANNA.S", "PRIYADHARSHINI.K", "HARIHARAN.S", "YETHEESHWAR.B.R"],
            "2026-02-20": ["HARSHVARDHAN.S", "MOHAMAD SALMANKHAN.N", "DEEPIKASRI.R.K", "PRADHIKSHA.M.P", "DINESH PANDI.R", "YAZHINI.M", "MATTHEW PAULS.A", "GURU VIGNESHWARAN.S", "BRINTHA.J", "GAUTHAM.S", "SRIMATHI.B", "PRINCE VICTOR.A", "MAHALAKSHMI.G", "UMA MAHESWARI.M", "YOGESH.K"],
            "2026-02-21": ["KARTHICK PANDIAN.M", "KABIL VISHWA.TM", "HARI PRASATH.G", "NAVANEETHA KRISHNAN.R", "ALLEN VICTOR.A", "HARSHITHAA SHREE.R", "KARTHIKEYAN.P", "DHARUNYA SHREE.G", "HIBSA FARITH.S.H", "DHAKSHANA.K", "ABISHEK.S", "HARSHINI.S.D", "SHARMILA.J", "HEMA VARSHINI.A", "HARSHINI.S"],
            "2026-02-24": ["BALAJI.N", "NITESH VARMAN.M", "MAHENDRAN.N.P", "HARICHARAN.S.P", "SAKTHI DIVASHKAR.M", "HARISH KARTHICK.R", "PADMASINDUJA.K", "LAKSHMI.L", "BOOPESH.K.V", "SENTHAMILSELVI.M", "KHAN MOHAMAD.S", "SWETHA ROSE.S", "VENKATAPRIYA.S", "YUVASRI.K", "SUJITHA.J.T"],
            "2026-02-25": ["PRIYADHARSHINI.K", "HARIHARAN.S", "YETHEESHWAR.B.R", "VIMAL.V.S", "RAHUL.P", "MOHAMAD YUNUS.R", "ABISHEK MILTON.T", "DIVYESH SANKAR.N.K", "GOKUL.S", "YOGAHARANI.A", "MAGATHI.M", "SHRUTI.K", "LATHIKA.S", "DEVIPRIYA.T", "SANTHOSH KANNA.S"],
            "2026-02-26": ["MAHALAKSHMI.G", "UMA MAHESWARI.M", "YOGESH.K", "MATTHEW PAULS.A", "GURU VIGNESHWARAN.S", "BRINTHA.J", "PRADHIKSHA.M.P", "DINESH PANDI.R", "YAZHINI.M", "GAUTHAM.S", "SRIMATHI.B", "PRINCE VICTOR.A", "HARSHVARDHAN.S", "MOHAMAD SALMANKHAN.N", "DEEPIKASRI.R.K"],
            "2026-02-27": ["SHARMILA.J", "HEMA VARSHINI.A", "HARSHINI.S", "DHAKSHANA.K", "ABISHEK.S", "HARSHINI.S.D", "KARTHIKEYAN.P", "DHARUNYA SHREE.G", "HIBSA FARITH.S.H", "NAVANEETHA KRISHNAN.R", "ALLEN VICTOR.A", "HARSHITHAA SHREE.R", "KARTHICK PANDIAN.M", "KABIL VISHWA.TM", "HARI PRASATH.G"]
        };

        const flatRolesList = roleGroups.flat();

        let currentDate = parseISO(startDate);
        const isStartOfMonth = currentDate.getDate() === 1;
        const daysToGenerate = isStartOfMonth ? 31 : 12;
        const targetMonth = currentDate.getMonth();

        const newEntries = [];

        for (let i = 0; i < daysToGenerate; i++) {
            if (isStartOfMonth && currentDate.getMonth() !== targetMonth) break;

            const dateStr = format(currentDate, "yyyy-MM-dd");
            const isSunday = currentDate.getDay() === 0;

            if (isSunday || holidays.includes(dateStr)) {
                currentDate = addDays(currentDate, 1);
                continue;
            }

            const { count } = await supabase.from('schedule').select('*', { count: 'exact', head: true }).eq('date', dateStr);

            // Atomicity: check if roles already exist for this date before inserting
            const { data: existingRoles } = await supabase
                .from('schedule')
                .select('id')
                .eq('date', dateStr)
                .limit(1);

            if (!existingRoles || existingRoles.length === 0) {
                let workingDayCount = 0;
                let tempDate = baselineDate;
                while (tempDate < currentDate) {
                    const tempDateStr = format(tempDate, "yyyy-MM-dd");
                    if (tempDate.getDay() !== 0 && !holidays.includes(tempDateStr)) {
                        workingDayCount++;
                    }
                    tempDate = addDays(tempDate, 1);
                }

                if (febHardcoded[dateStr]) {
                    const rolePlayerNames = febHardcoded[dateStr];
                    for (let rIdx = 0; rIdx < 15; rIdx++) {
                        const name = rolePlayerNames[rIdx];
                        const member = members.find(m => m.name.trim().toLowerCase() === name.trim().toLowerCase());
                        if (member) {
                            newEntries.push({
                                date: dateStr,
                                role_id: flatRolesList[rIdx],
                                original_member_id: member.id,
                                current_member_id: member.id
                            });
                        }
                    }
                } else {
                    const setIdx = workingDayCount % 4; // 4 sets of 15 members
                    const stepIdx = Math.floor(workingDayCount / 4) % 5; // 5 steps in rotation
                    const mapping = triadRotationMappings[stepIdx];

                    // Role Players (15 members)
                    for (let tIdx = 0; tIdx < 5; tIdx++) {
                        const triadId = tIdx + 1;
                        const destinationGroupIdx = mapping[tIdx] - 1;
                        const triadMembers = [
                            members[setIdx * 15 + tIdx * 3],
                            members[setIdx * 15 + tIdx * 3 + 1],
                            members[setIdx * 15 + tIdx * 3 + 2]
                        ];

                        for (let rIdx = 0; rIdx < 3; rIdx++) {
                            newEntries.push({
                                date: dateStr,
                                role_id: roleGroups[destinationGroupIdx][rIdx],
                                original_member_id: triadMembers[rIdx].id,
                                current_member_id: triadMembers[rIdx].id
                            });
                        }
                    }
                }

                // Backups (3 members - Triad 1 of the NEXT set)
                const setIdxForBackup = workingDayCount % 4;
                const nextSetIdx = (setIdxForBackup + 1) % 4;
                for (let bIdx = 0; bIdx < 3; bIdx++) {
                    const backupMember = members[nextSetIdx * 15 + bIdx];
                    newEntries.push({
                        date: dateStr,
                        role_id: `BACKUP_${bIdx + 1}`,
                        original_member_id: backupMember.id,
                        current_member_id: backupMember.id
                    });
                }
            }
            currentDate = addDays(currentDate, 1);
        }

        if (newEntries.length > 0) {
            await supabase.from('schedule').insert(newEntries);
        }
    },

    async shiftSchedule(startDate: string, reason: string) {
        // 1. Capture current state for undo
        const [{ data: originalSchedule }, { data: originalIcebreakers }] = await Promise.all([
            supabase.from('schedule').select('*').gte('date', startDate),
            supabase.from('daily_icebreaker').select('*').gte('date', startDate)
        ]);

        await supabase.from('schedule_history').insert({
            operation_type: 'shift',
            original_schedule: originalSchedule,
            original_icebreakers: originalIcebreakers,
            holiday_date: startDate
        });

        // 2. Add to holidays
        await supabase.from('holidays').upsert({ date: startDate, reason: reason || "Unexpected Holiday" });

        // 3. Get all unique dates from schedule >= startDate in DESCENDING order
        const { data: scheduleDates } = await supabase.from('schedule').select('date').gte('date', startDate).order('date', { ascending: false });
        const dates = Array.from(new Set(scheduleDates?.map(d => d.date)));

        const { data: holidayData } = await supabase.from('holidays').select('date');
        const holidayDates = holidayData?.map(h => h.date) || [];

        for (const d of dates) {
            let nextDate = addDays(parseISO(d), 1);
            while (isWeekend(nextDate) || holidayDates.includes(format(nextDate, "yyyy-MM-dd"))) {
                nextDate = addDays(nextDate, 1);
            }
            const nextDateStr = format(nextDate, "yyyy-MM-dd");

            await Promise.all([
                supabase.from('schedule').update({ date: nextDateStr }).eq('date', d),
                supabase.from('daily_icebreaker').update({ date: nextDateStr }).eq('date', d)
            ]);
        }
    },

    async undoShift() {
        const { data: lastHistory, error } = await supabase
            .from('schedule_history')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (error || !lastHistory) throw new Error("No history to undo");

        const originalSchedule = lastHistory.original_schedule;
        const originalIcebreakers = lastHistory.original_icebreakers;
        const holidayDate = lastHistory.holiday_date;

        await Promise.all([
            supabase.from('schedule').delete().gte('date', holidayDate),
            supabase.from('daily_icebreaker').delete().gte('date', holidayDate),
            supabase.from('holidays').delete().eq('date', holidayDate)
        ]);

        if (originalSchedule && originalSchedule.length > 0) {
            // Map back to Supabase field names if necessary (they should already match if we saved them correctly)
            await supabase.from('schedule').insert(originalSchedule);
        }

        if (originalIcebreakers && originalIcebreakers.length > 0) {
            await supabase.from('daily_icebreaker').insert(originalIcebreakers);
        }

        await supabase.from('schedule_history').delete().eq('id', lastHistory.id);
    },

    async deleteAllSchedule() {
        const { error } = await supabase.from('schedule').delete().neq('id', 0);
        if (error) throw error;
    },

    async syncMembers() {
        const membersList = [
            { rollNo: "25UEC002", name: "NAVANEETHA KRISHNAN.R" },
            { rollNo: "25UEC004", name: "ALLEN VICTOR.A" },
            { rollNo: "25UEC006", name: "HARSHITHAA SHREE.R" },
            { rollNo: "25UEC008", name: "KARTHICK PANDIAN.M" },
            { rollNo: "25UEC010", name: "KABIL VISHWA.TM" },
            { rollNo: "25UEC012", name: "HARI PRASATH.G" },
            { rollNo: "25UEC014", name: "SHARMILA.J" },
            { rollNo: "25UEC016", name: "HEMA VARSHINI.A" },
            { rollNo: "25UEC018", name: "HARSHINI.S" },
            { rollNo: "25UEC020", name: "KARTHIKEYAN.P" },
            { rollNo: "25UEC022", name: "DHARUNYA SHREE.G" },
            { rollNo: "25UEC023", name: "HIBSA FARITH.S.H" },
            { rollNo: "25UEC024", name: "DHAKSHANA.K" },
            { rollNo: "25UEC026", name: "ABISHEK.S" },
            { rollNo: "25UEC028", name: "HARSHINI.S.D" },
            { rollNo: "25UEC030", name: "HARICHARAN.S.P" },
            { rollNo: "25UEC032", name: "SAKTHI DIVASHKAR.M" },
            { rollNo: "25UEC036", name: "HARISH KARTHICK.R" },
            { rollNo: "25UEC038", name: "BALAJI.N" },
            { rollNo: "25UEC040", name: "NITESH VARMAN.M" },
            { rollNo: "25UEC042", name: "MAHENDRAN.N.P" },
            { rollNo: "25UEC044", name: "VENKATAPRIYA.S" },
            { rollNo: "25UEC046", name: "YUVASRI.K" },
            { rollNo: "25UEC048", name: "SUJITHA.J.T" },
            { rollNo: "25UEC050", name: "PADMASINDUJA.K" },
            { rollNo: "25UEC051", name: "LAKSHMI.L" },
            { rollNo: "25UEC052", name: "BOOPESH.K.V" },
            { rollNo: "25UEC054", name: "SENTHAMILSELVI.M" },
            { rollNo: "25UEC056", name: "KHAN MOHAMAD.S" },
            { rollNo: "25UEC057", name: "SWETHA ROSE.S" },
            { rollNo: "25UEC058", name: "VIMAL.V.S" },
            { rollNo: "25UEC059", name: "RAHUL.P" },
            { rollNo: "25UEC062", name: "MOHAMADYUNUS.R" },
            { rollNo: "25UEC064", name: "PRIYADHARSHINI.K" },
            { rollNo: "25UEC066", name: "HARIHARAN.S" },
            { rollNo: "25UEC067", name: "YETHEESHWAR.B.R" },
            { rollNo: "25UEC068", name: "LATHIKA.S" },
            { rollNo: "25UEC069", name: "DEVIPRIYA.T" },
            { rollNo: "25UEC074", name: "SANTHOSHKANNA.S" },
            { rollNo: "25UEC075", "name": "ABISHEK MILTON.T" },
            { rollNo: "25UEC076", "name": "DIVYESH SANKAR.N.K" },
            { rollNo: "25UEC082", "name": "GOKUL.S" },
            { rollNo: "25UEC083", "name": "YOGAHARANI.A" },
            { rollNo: "25UEC085", "name": "MAGATHI.M" },
            { rollNo: "25UEC086", "name": "SHRUTI.K" },
            { rollNo: "25UEC089", "name": "MATTHEW PAULS.A" },
            { rollNo: "25UEC092", "name": "GURU VIGNESHWARAN.S" },
            { rollNo: "25UEC096", "name": "BRINTHA.J" },
            { rollNo: "25UEC102", "name": "MAHALAKSHMI.G" },
            { rollNo: "25UEC103", "name": "UMA MAHESWARI.M" },
            { rollNo: "25UEC107", "name": "YOGESH.K" },
            { rollNo: "25UEC108", "name": "GAUTHAM.S" },
            { rollNo: "25UEC109", "name": "SRIMATHI.B" },
            { rollNo: "25UEC110", "name": "PRINCE VICTOR.A" },
            { rollNo: "25UEC111", "name": "PRADHIKSHA.M.P" },
            { rollNo: "25UEC113", "name": "DINESH PANDI.R" },
            { rollNo: "25UEC115", "name": "YAZHINI.M" },
            { rollNo: "25UEC116", "name": "HARSHVARDHAN.S" },
            { rollNo: "25UEC117", "name": "MOHAMAD SALMANKHAN.N" },
            { rollNo: "25UEC120", "name": "DEEPIKASRI.R.K" },
        ];

        const memberEntries = membersList.map((m, i) => ({
            roll_no: m.rollNo,
            name: m.name,
            attendance_order: i + 1,
            photo_url: `https://picsum.photos/seed/${m.rollNo}/200/200`
        }));

        const holidayEntries = [
            { date: '2026-02-14', reason: 'Weekend' },
            { date: '2026-02-15', reason: 'Weekend' },
            { date: '2026-02-22', reason: 'Weekend' },
            { date: '2026-02-23', reason: 'Holiday' },
            { date: '2026-02-28', reason: 'Weekend' },
            { date: '2026-03-01', reason: 'Sunday' },
            { date: '2026-03-07', reason: 'Annual Day' },
            { date: '2026-03-08', reason: 'Hostel Day' },
            { date: '2026-03-12', reason: 'Cycle Test I' },
            { date: '2026-03-13', reason: 'Cycle Test I' },
            { date: '2026-03-14', reason: 'Cycle Test I' },
            { date: '2026-03-15', reason: 'Sunday' },
            { date: '2026-03-16', reason: 'Cycle Test I' },
            { date: '2026-03-17', reason: 'Cycle Test I' },
            { date: '2026-03-18', reason: 'Cycle Test I' },
            { date: '2026-03-19', reason: 'Telugu New Year' },
            { date: '2026-03-20', reason: 'Additional Holiday' },
            { date: '2026-03-21', reason: 'Ramzan' },
            { date: '2026-03-22', reason: 'Sunday' },
            { date: '2026-03-28', reason: "Funtura' 26" },
            { date: '2026-03-29', reason: 'Sunday' },
            { date: '2026-04-02', reason: 'Parent Teachers Meeting' },
            { date: '2026-04-03', reason: 'Good Friday' },
            { date: '2026-04-04', reason: 'Holiday' },
            { date: '2026-04-05', reason: 'Sunday' },
            { date: '2026-04-06', reason: 'Pongal Festival' },
            { date: '2026-04-07', reason: 'Pongal Festival' },
            { date: '2026-04-11', reason: 'Sustainathon' },
            { date: '2026-04-12', reason: 'Sunday' },
            { date: '2026-04-14', reason: 'Tamil New Year' },
            { date: '2026-04-18', reason: 'Ethnic Day' },
            { date: '2026-04-19', reason: 'Sunday' },
            { date: '2026-04-25', reason: 'Seminar Day' },
            { date: '2026-04-26', reason: 'Sunday' },
            { date: '2026-04-27', reason: 'Feedback Day' },
            { date: '2026-04-30', reason: 'Model Practical' }
        ];

        const icebreakerEntries = [
            { name: 'Electric Pulse', description: 'A high-energy reaction game.' },
            { name: 'Guess the Name', description: 'Identify the member from clues.' },
            { name: 'Get the Signature', description: 'Networking and social bingo.' },
            { name: 'Enact the Word', description: 'Charades-style communication game.' },
        ];

        const announcementEntries = [
            { title: 'Welcome to ECE_B Toastmasters', content: 'We are excited to launch our new digital platform.', date: '2026-02-28', type: 'info' }
        ];

        // Perform upserts to avoid duplication
        await Promise.all([
            supabase.from('members').upsert(memberEntries, { onConflict: 'roll_no' }),
            supabase.from('holidays').upsert(holidayEntries, { onConflict: 'date' }),
            supabase.from('icebreaker_bank').upsert(icebreakerEntries, { onConflict: 'name' }),
            supabase.from('announcements').upsert(announcementEntries, { onConflict: 'title' }) // Upserting by title as a crude unique key
        ]);
    }
};
