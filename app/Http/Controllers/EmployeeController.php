<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    /**
     * Apply authorization policies to the controller.
     */
    public function __construct()
    {
        $this->authorizeResource(Employee::class, 'employee');
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Employee::class);

        $query = Employee::with(['user', 'branch'])->orderBy('first_name')->orderBy('last_name');

        $search = $request->input('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhereHas('branch', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        return Inertia::render('Employees/Index', [
            'employees' => $query->paginate(10)->withQueryString(),
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Employee::class);

        return Inertia::render('Employees/Create', [
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreEmployeeRequest $request): RedirectResponse
    {
        $this->authorize('create', Employee::class);

        $validated = $request->validated();

        DB::transaction(function () use ($validated) {
            $employee = Employee::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'job_title' => $validated['job_title'],
                'contact_number' => $validated['contact_number'],
                'branch_id' => $validated['branch_id'],
                'is_active' => $validated['is_active'],
            ]);

            if ($validated['create_user_account']) {
                $user = User::create([
                    'name' => $validated['first_name'] . ' ' . $validated['last_name'],
                    'email' => $validated['email'],
                    'password' => Hash::make($validated['password']),
                    'role' => $validated['role'],
                ]);
                $employee->user()->associate($user);
                $employee->save();
            }
        });

        return redirect()->route('employees.index')->with('success', 'Employee created successfully.');
    }

    public function edit(Employee $employee): Response
    {
        $this->authorize('update', $employee);

        $employee->load(['user', 'branch']);
        return Inertia::render('Employees/Edit', [
            'employee' => $employee,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee): RedirectResponse
    {
        $this->authorize('update', $employee);

        $validated = $request->validated();

        DB::transaction(function () use ($validated, $employee) {
            $employee->update([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'job_title' => $validated['job_title'],
                'contact_number' => $validated['contact_number'],
                'branch_id' => $validated['branch_id'],
                'is_active' => $validated['is_active'],
            ]);

            if ($validated['create_user_account']) {
                if ($employee->user) {
                    $employee->user->update([
                        'name' => $validated['first_name'] . ' ' . $validated['last_name'],
                        'email' => $validated['email'],
                        'role' => $validated['role'],
                    ]);
                    if (!empty($validated['password'])) {
                        $employee->user->update(['password' => Hash::make($validated['password'])]);
                    }
                } else {
                    $user = User::create([
                        'name' => $validated['first_name'] . ' ' . $validated['last_name'],
                        'email' => $validated['email'],
                        'password' => Hash::make($validated['password']),
                        'role' => $validated['role'],
                    ]);
                    $employee->user()->associate($user);
                    $employee->save();
                }
            } elseif ($employee->user) {
                $employee->user_id = null;
                $employee->save();
            }
        });

        return redirect()->route('employees.index')->with('success', 'Employee updated successfully.');
    }

    public function deactivate(Employee $employee): RedirectResponse
    {
        $this->authorize('update', $employee);

        $employee->update(['is_active' => !$employee->is_active]);
        $status = $employee->is_active ? 'activated' : 'deactivated';
        return redirect()->back()->with('success', "Employee has been {$status}.");
    }

    public function destroy(Employee $employee): RedirectResponse
    {
        $this->authorize('delete', $employee);

        // This is now for archiving (soft delete)
        $employee->delete();
        return redirect()->route('employees.index')->with('success', 'Employee archived successfully.');
    }

    public function archived(Request $request): Response
    {
        $this->authorize('viewAny', Employee::class);

        $query = Employee::onlyTrashed()->with(['user', 'branch']);

        $search = $request->input('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        return Inertia::render('Employees/Archived', [
            'employees' => $query->latest('deleted_at')->paginate(10)->withQueryString(),
            'filters' => ['search' => $search],
        ]);
    }

    public function restore(Employee $employee): RedirectResponse
    {
        $this->authorize('restore', $employee);

        $employee->restore();
        return redirect()->route('employees.archived')->with('success', 'Employee restored successfully.');
    }
}
